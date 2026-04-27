"""
llm_graph.py
LangGraph StateGraph that orchestrates the LLM-powered agent pipeline.

Pipeline:
    START → scout → should_continue? → mapper → has_impacts? → optimizer → communicator → END

Each node wraps an LLM agent call. Conditional edges route based
on intermediate results (no actionable alerts → skip remaining stages).

The graph operates on a shared AgentState TypedDict that carries
alerts, shipments, graph data, risk scores, logs, and reroutes
through the pipeline.
"""

from __future__ import annotations

import logging
from typing import Any, TypedDict

from langgraph.graph import StateGraph, END

from backend.ml.anomaly import DisruptionAlert
from backend.graph.supply_graph import SupplyChainGraph

from backend.agents.scout import ScoutAgent
from backend.agents.mapper import MapperAgent
from backend.agents.optimizer import OptimizerAgent
from backend.agents.communicator import CommunicatorAgent

log = logging.getLogger("nerve.graph")


# ── State schema ────────────────────────────────────────────────

class AgentState(TypedDict):
    """Typed state carried through the LangGraph pipeline."""
    # Inputs
    alerts: list[Any]                              # DisruptionAlert objects
    scg: Any                                       # SupplyChainGraph instance
    risk_scores: dict[str, float]
    cascade_debt: list[dict]
    processed_shipments: dict[str, dict]

    # Intermediate results
    actionable_alerts: list[Any]                   # Filtered by Scout
    impacts: dict[str, list[dict]]                 # Mapped by Mapper
    reroutes: dict[str, list[str]]                 # Computed by Optimizer
    optimizer_reasoning: dict[str, str]            # LLM reasoning per shipment

    # Outputs
    agent_logs: list[dict]


# ── Agent instances (shared across invocations) ─────────────────

_scout = ScoutAgent()
_mapper = MapperAgent()
_optimizer = OptimizerAgent()
_communicator = CommunicatorAgent()


# ── Node functions ──────────────────────────────────────────────

def scout_node(state: AgentState) -> dict:
    """Run the Scout agent to triage alerts."""
    alerts = state["alerts"]

    actionable, logs = _scout.inspect_llm(alerts)

    return {
        "actionable_alerts": actionable,
        "agent_logs": state.get("agent_logs", []) + logs,
    }


def mapper_node(state: AgentState) -> dict:
    """Run the Mapper agent to identify impacted shipments."""
    actionable = state["actionable_alerts"]
    scg: SupplyChainGraph = state["scg"]

    impacts, logs = _mapper.map_impact_llm(actionable, scg.shipments)

    return {
        "impacts": impacts,
        "agent_logs": state.get("agent_logs", []) + logs,
    }


def optimizer_node(state: AgentState) -> dict:
    """Run the Optimizer agent to compute reroutes."""
    impacts = state["impacts"]
    actionable = state["actionable_alerts"]
    scg: SupplyChainGraph = state["scg"]
    risk_scores = state.get("risk_scores", {})
    cascade_debt = state.get("cascade_debt", [])
    processed_shipments = state.get("processed_shipments", {})

    reroutes, logs, reasoning = _optimizer.optimize_llm(
        impacts, actionable, scg,
        risk_scores=risk_scores,
        cascade_debt=cascade_debt,
        processed_shipments=processed_shipments,
    )

    return {
        "reroutes": reroutes,
        "optimizer_reasoning": reasoning,
        "processed_shipments": processed_shipments,
        "agent_logs": state.get("agent_logs", []) + logs,
    }


def communicator_node(state: AgentState) -> dict:
    """Run the Communicator agent to generate messages."""
    reroutes = state.get("reroutes", {})
    scg: SupplyChainGraph = state["scg"]
    actionable = state["actionable_alerts"]
    reasoning = state.get("optimizer_reasoning", {})

    if not reroutes:
        return {"agent_logs": state.get("agent_logs", [])}

    logs = _communicator.communicate_llm(
        reroutes, scg.shipments, actionable,
        optimizer_reasoning=reasoning,
    )

    return {
        "agent_logs": state.get("agent_logs", []) + logs,
    }


# ── Conditional edge functions ──────────────────────────────────

def should_continue_after_scout(state: AgentState) -> str:
    """Route to mapper if there are actionable alerts, else end."""
    if state.get("actionable_alerts"):
        return "mapper"
    return END


def should_continue_after_mapper(state: AgentState) -> str:
    """Route to optimizer if there are impacted shipments, else end."""
    if state.get("impacts"):
        return "optimizer"
    return END


# ── Build the graph ─────────────────────────────────────────────

def build_agent_graph() -> StateGraph:
    """
    Construct and compile the LangGraph StateGraph for the
    agent pipeline.

    Returns the compiled graph ready for .invoke().
    """
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("scout", scout_node)
    graph.add_node("mapper", mapper_node)
    graph.add_node("optimizer", optimizer_node)
    graph.add_node("communicator", communicator_node)

    # Set entry point
    graph.set_entry_point("scout")

    # Conditional edges
    graph.add_conditional_edges(
        "scout",
        should_continue_after_scout,
        {"mapper": "mapper", END: END},
    )
    graph.add_conditional_edges(
        "mapper",
        should_continue_after_mapper,
        {"optimizer": "optimizer", END: END},
    )

    # Linear edges
    graph.add_edge("optimizer", "communicator")
    graph.add_edge("communicator", END)

    return graph.compile()


# ── Singleton compiled graph ────────────────────────────────────

_compiled_graph = None


def get_agent_graph():
    """Return the compiled agent graph (singleton)."""
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_agent_graph()
        log.info("LangGraph agent pipeline compiled successfully")
    return _compiled_graph
