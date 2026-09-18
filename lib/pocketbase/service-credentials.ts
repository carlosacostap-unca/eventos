import { createHash, createHmac } from "node:crypto";

function technicalPassword(
  adminPassword: string,
  context: string,
  normalizedUrl: string,
) {
  return createHmac("sha256", adminPassword)
    .update(context + "|" + normalizedUrl)
    .digest("base64url");
}

export function deriveServiceCredentials(input: {
  url: string;
  adminEmail: string;
  adminPassword: string;
}) {
  const normalizedUrl = input.url.replace(/\/+$/, "").toLowerCase();
  const normalizedEmail = input.adminEmail.trim().toLowerCase();
  const identity = createHash("sha256")
    .update(normalizedUrl + "|" + normalizedEmail)
    .digest("hex")
    .slice(0, 16);
  return {
    email: "eventos-" + identity + "@service.invalid",
    password: technicalPassword(
      input.adminPassword,
      "eventos-pocketbase-service-v1",
      normalizedUrl,
    ),
    administratorPassword: technicalPassword(
      input.adminPassword,
      "eventos-application-admin-v1",
      normalizedUrl,
    ),
  };
}
