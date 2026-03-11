// Business utility functions

export const formatWONumber = (n: number) => `#${String(n).padStart(4, '0')}`

export const whatsappLink = (phone: string, msg: string) => {
  const clean = phone.replace(/\D/g, '')
  const number = clean.startsWith('55') ? clean : `55${clean}`
  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`
}

export const recurrenceMessage = (
  clientName: string,
  serviceType: string,
  companyName: string,
  companyPhone: string
) => `Olá, ${clientName}! 👋
Passando para lembrar que o serviço de ${serviceType} está próximo do vencimento.
Posso verificar a agenda para agendar?
Qualquer dúvida estou à disposição! 😊
— ${companyName} · ${companyPhone}`

export const recurrenceUrgency = (nextDate: string) => {
  const days = Math.ceil(
    (new Date(nextDate).getTime() - Date.now()) / 86400000
  )
  if (days < 0) return { label: 'Vencido', color: 'destructive' as const, days }
  if (days <= 7) return { label: `${days}d`, color: 'warning' as const, days }
  if (days <= 15) return { label: `${days}d`, color: 'secondary' as const, days }
  return { label: `${days}d`, color: 'default' as const, days }
}

export const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

export const formatCurrency = (value: number) =>
  `R$ ${value.toFixed(2).replace('.', ',')}`

export const formatDateBR = (date: string | Date) => {
  const d = typeof date === 'string'
    ? new Date(date.length === 10 ? `${date}T12:00:00` : date)
    : date
  return d.toLocaleDateString('pt-BR')
}
