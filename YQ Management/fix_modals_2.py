import os
import re

def update_files(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                path = os.path.join(root, file)
                with open(path, 'r') as f:
                    content = f.read()
                
                def replace_func(match):
                    cls_str = match.group(0)
                    if 'fixed inset-0' in cls_str:
                        # Remove existing bg/blur classes
                        cls_str = re.sub(r'\s*bg-black/\d+', '', cls_str)
                        cls_str = re.sub(r'\s*dark:bg-black/\d+', '', cls_str)
                        cls_str = re.sub(r'\s*backdrop-blur-[a-zA-Z0-9\[\]\-]+', '', cls_str)
                        
                        # Add new premium classes
                        cls_str = cls_str.replace('fixed inset-0', 'fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md')
                        return cls_str
                    return cls_str
                
                new_content = re.sub(r'className="[^"]*fixed inset-0[^"]*"', replace_func, content)
                
                if new_content != content:
                    with open(path, 'w') as f:
                        f.write(new_content)
                    print(f"Fixed {path}")

update_files('frontend/src')
