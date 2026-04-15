import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-4">Family Fans Mony</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Conectando creadores con anunciantes
      </p>
      <div className="flex gap-4">
        <Link to="/login">
          <Button>Iniciar Sesión</Button>
        </Link>
        <Link to="/register">
          <Button variant="outline">Registrarse</Button>
        </Link>
      </div>
    </div>
  );
}
