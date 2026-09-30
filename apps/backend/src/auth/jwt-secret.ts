/**
 * Both JwtModule.register() and JwtStrategy need the same secret at boot
 * time. Previously each fell back to a hardcoded literal ('dcash-secret')
 * if JWT_SECRET was unset — meaning a misconfigured environment would
 * silently start issuing tokens signable by anyone who read the source.
 * Failing fast here makes that impossible.
 */
export function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error(
      'JWT_SECRET não configurado (ou muito curto — mínimo 16 caracteres). ' +
        'Defina uma variável de ambiente JWT_SECRET forte antes de iniciar o servidor.',
    );
  }
  return secret;
}
