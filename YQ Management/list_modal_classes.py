import os
import re

classes = set()
for root, _, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                for line in f:
                    if 'className="fixed inset-0' in line:
                        match = re.search(r'className="([^"]+)"', line)
                        if match:
                            classes.add(match.group(1))
                        
for c in classes:
    print(c)
