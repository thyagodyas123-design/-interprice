export async function listPartituras(): Promise<string[]> {
  const res = await fetch("/api/partituras");
  if (!res.ok) throw new Error("list failed: " + res.status);
  return res.json();
}
export async function loadPartitura(name: string) {
  const res = await fetch(`/api/partituras/${name}`);
  if (!res.ok) throw new Error("load failed: " + res.status);
  return res.json();
}
export async function savePartitura(name: string, body: unknown) {
  const res = await fetch(`/api/partituras/${name}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("save failed: " + res.status);
}
