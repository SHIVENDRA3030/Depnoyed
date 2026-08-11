import sys

file_path = r'd:\traeprojects\depnoyed\Depnoyed\src\components\marketplace\views\login-view.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The extra closing div is around line 435. Let's find it.
# We will just remove one </div> that comes right before <div className="scroll-line"
for i in range(len(lines)):
    if 'className="scroll-line"' in lines[i]:
        # check line i-1
        if '</div>' in lines[i-1]:
            lines.pop(i-1)
            break

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Success')
