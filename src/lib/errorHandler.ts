export function friendlyError(err: any): string {
  const code = err?.code;
  if (code === '23505') return 'Registro duplicado.';
  if (code === '23503') return 'Referência inválida.';
  if (code === '42501') return 'Sem permissão para esta operação.';
  if (code === '23502') return 'Campo obrigatório não preenchido.';
  if (code === '23514') return 'Valor fora do permitido.';
  return 'Ocorreu um erro. Tente novamente.';
}
