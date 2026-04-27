
import os

pages_dir = r"d:\program\python\course\project_main\SCM_NEW\Practice-repo\frontend\src\pages"
for root, _, files in os.walk(pages_dir):
    for file in files:
        if file.endswith(".jsx"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
                if "<header" in content:
                    print(f"--- {file} ---")
                    start = content.find("return (")
                    if start != -1:
                        print(content[start:start+400])
                    print("\n")

