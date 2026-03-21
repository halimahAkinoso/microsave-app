import { Link } from "react-router-dom"

export default function Navbar() {
  return (
    <div className="bg-slate-900 text-white p-4 flex justify-between">
      <h1 className="font-bold">MicroSave</h1>

      <div className="flex gap-4">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/groups">Groups</Link>
        <Link to="/loans">Loans</Link>
      </div>
    </div>
  )
}