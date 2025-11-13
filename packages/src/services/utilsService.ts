export async function getServerTimeFromHeader() {
    const res = await fetch("/", { method: "HEAD", cache: "no-store" });
    const dateHeader = res.headers.get("Date");
    if (!dateHeader) throw new Error("No se encontró la cabecera Date");

    return new Date(dateHeader);
}