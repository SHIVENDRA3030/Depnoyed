import re

with open('backend/kubernetes/adapter.ts', 'r') as f:
    content = f.read()

# Add getErrorCode helper
helper = '''
function getErrorCode(err: any): number | undefined {
  if (typeof err?.statusCode === 'number') return err.statusCode;
  if (typeof err?.code === 'number') return err.code;
  if (err?.response?.statusCode) return err.response.statusCode;
  if (typeof err?.body === 'string') {
    try {
      const parsed = JSON.parse(err.body);
      if (typeof parsed.code === 'number') return parsed.code;
    } catch {}
  }
  if (err?.body?.code) return err.body.code;
  return undefined;
}
'''

if 'function getErrorCode' not in content:
    content = content.replace('const BASE_DOMAIN = ', helper + '\nconst BASE_DOMAIN = ')

# Fix ensureNamespace
content = re.sub(
    r'const code = err\.statusCode \|\| err\.code \|\| err\.body\?\.code;\s*if \(code === 404\) {',
    r'if (getErrorCode(err) === 404) {',
    content
)
content = re.sub(
    r'const ecode = e\.statusCode \|\| e\.code \|\| e\.body\?\.code;\s*if \(ecode !== 409\) throw e;',
    r'if (getErrorCode(e) !== 409) throw e;',
    content
)

# Fix other catch blocks
content = re.sub(
    r'const code = err\.statusCode \|\| err\.code \|\| err\.body\?\.code;\s*if \(code !== 409\) throw err;',
    r'if (getErrorCode(err) !== 409) throw err;',
    content
)
content = re.sub(
    r'const code = err\.statusCode \|\| err\.code \|\| err\.body\?\.code;\s*if \(code !== 404\) throw err;',
    r'if (getErrorCode(err) !== 404) throw err;',
    content
)
content = re.sub(
    r'if \(err\.statusCode === 404\) return null;',
    r'if (getErrorCode(err) === 404) return null;',
    content
)

# Add try/catch for 404 to startContainer
start_c = '''  async startContainer(name: string, tenantId: string): Promise<ContainerInfo> {
    const namespace = getNamespace(tenantId);
    try {
      await appsApi.patchNamespacedDeploymentScale({ name, namespace, body: { spec: { replicas: 1 } } });
    } catch(err: any) {
      if (getErrorCode(err) !== 404) throw err;
    }
    return { id: name, name, status: "creating", image: "" };
  }'''
content = re.sub(r'  async startContainer.*?return \{ id: name, name, status: "creating", image: "" \};\n  \}', start_c, content, flags=re.DOTALL)

# Add try/catch for 404 to stopContainer
stop_c = '''  async stopContainer(name: string, tenantId: string): Promise<ContainerInfo> {
    const namespace = getNamespace(tenantId);
    try {
      await appsApi.patchNamespacedDeploymentScale({ name, namespace, body: { spec: { replicas: 0 } } });
    } catch(err: any) {
      if (getErrorCode(err) !== 404) throw err;
    }
    return { id: name, name, status: "stopped", image: "" };
  }'''
content = re.sub(r'  async stopContainer.*?return \{ id: name, name, status: "stopped", image: "" \};\n  \}', stop_c, content, flags=re.DOTALL)

with open('backend/kubernetes/adapter.ts', 'w') as f:
    f.write(content)
