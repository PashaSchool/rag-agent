import { signIn } from "../../auth";

export default function LoginPage() {
  const onAction = async () => {
    "use server";

    await signIn("github", { redirectTo: "/" });
  };

  return (
    <div>
      <h1>Login page</h1>
      <form action={onAction}>
        <button type="submit">Login with GitHub</button>
      </form>
    </div>
  );
}
