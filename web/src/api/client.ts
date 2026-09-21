export async function listPartituras(): Promise<string[]> {
  return (await fetch("/api/partituras")).json();
}
export async function loadPartitura(name: string) {
  return (await fetch(`/api/partituras/${name}`)).json();
}
export async function savePartitura(name: string, body: unknown) {
  await fetch(`/api/partituras/${name}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}
