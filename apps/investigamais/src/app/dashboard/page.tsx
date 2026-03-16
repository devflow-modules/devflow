import Link from "next/link";

export default function DashboardHomePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <nav className="mt-4 flex flex-wrap gap-4">
        <Link href="/dashboard/consulta" className="text-blue-600 underline">Nova consulta CNPJ</Link>
        <Link href="/dashboard/historico" className="text-blue-600 underline">Histórico</Link>
        <Link href="/dashboard/perfil" className="text-blue-600 underline">Perfil</Link>
        <Link href="/dashboard/assinatura" className="text-blue-600 underline">Assinatura</Link>
      </nav>
      <p className="mt-4 text-gray-600">Use o menu acima para consultar CNPJ, ver histórico ou editar seu perfil.</p>
    </div>
  );
}
