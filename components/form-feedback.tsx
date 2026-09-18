export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p className="field-error" role="alert">
      {errors[0]}
    </p>
  );
}

export function FormMessage({
  message,
  success,
}: {
  message?: string;
  success?: boolean;
}) {
  if (!message) return null;
  return (
    <div className={success ? "notice notice-success" : "notice notice-error"} role="status">
      {message}
    </div>
  );
}
