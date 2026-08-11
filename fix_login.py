import sys
import re

file_path = r'd:\traeprojects\depnoyed\Depnoyed\src\components\marketplace\views\login-view.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the null parameter in GSAP call
content = content.replace(", null, '-=0.4');", ", undefined, '-=0.4');")

# Replace all <!-- ... --> with {/* ... */}
content = re.sub(r'<!--(.*?)-->', r'{/*\1*/}', content)

# Replace class= with className=
content = re.sub(r' class=', r' className=', content)

# Fix <br> to <br/>
content = re.sub(r'<br>', r'<br/>', content)

# Fix <img> without closing tag
content = re.sub(r'(<img[^>]*?[^/])>', r'\1 />', content)

# Fix style tags
content = content.replace('style="opacity: 0"', 'style={{opacity: 0}}')
content = content.replace('style="opacity: "0""', 'style={{opacity: 0}}')
content = content.replace('style={{opacity: "0"}}', 'style={{opacity: 0}}')
content = content.replace('style={{opacity: "0", zIndex: 10, position: "relative"}}', 'style={{opacity: 0, zIndex: 10, position: "relative"}}')
content = content.replace('style={{marginTop: "48px"}}', 'style={{marginTop: 48}}')
content = content.replace('style="marginTop: 16px; paddingTop: 16px; borderTop: 1px solid rgba(216,212,204,.06)"', 'style={{marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(216,212,204,.06)"}}')
content = content.replace('style="justifyContent: center"', 'style={{justifyContent: "center"}}')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
