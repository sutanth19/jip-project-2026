import { useParams } from "react-router-dom";

export default function LoginPage() {
  const { role } = useParams();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">
        {role} Login
      </h1>
    </div>
  );
}