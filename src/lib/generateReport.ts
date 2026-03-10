import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

interface ReportInput {
  wo: {
    id: string;
    company_id: string;
    service_id: string;
    number: number;
    products_used: any[];
    areas_treated: any[];
    target_pests: string[];
    tech_notes: string | null;
  };
  service: {
    service_type: string;
    completed_at: string | null;
    address: string | null;
  };
  client: {
    id?: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    document?: string | null;
  } | null;
  company: {
    name: string;
    cnpj?: string | null;
    phone?: string | null;
    responsible_tech?: string | null;
    crq_crea?: string | null;
    settings?: any;
  };
}

function calcValidUntil(type: string): string {
  const months: Record<string, number> = {
    caixa_dagua: 4, "Limpeza de caixa d'água": 4,
    dedetizacao: 3, "Dedetização": 3,
    desratizacao: 3, "Desratização": 3,
    descupinizacao: 12, "Descupinização": 12,
    sanitizacao: 1, "Sanitização": 1,
  };
  const d = new Date();
  d.setMonth(d.getMonth() + (months[type] ?? 3));
  return d.toISOString().split('T')[0];
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

function buildLaudoHTML(wo: any, service: any, client: any, company: any): string {
  const logoUrl = company.settings?.logo_url;
  const validUntil = calcValidUntil(service?.service_type);

  return `
    <div style="margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1565C0;padding-bottom:16px">
      <div>
        ${logoUrl ? `<img src="${logoUrl}" style="height:50px;margin-bottom:8px" crossorigin="anonymous"/>` : ''}
        <div style="font-size:16pt;font-weight:bold;color:#1565C0">${company.name || ''}</div>
        <div style="font-size:9pt;color:#666">
          ${company.cnpj ? `CNPJ: ${company.cnpj}` : ''}${company.phone ? ` · ${company.phone}` : ''}
        </div>
      </div>
      <div style="text-align:right;font-size:14pt;font-weight:bold;color:#1565C0">
        OS #${String(wo.number).padStart(4, '0')}
      </div>
    </div>

    <div style="text-align:center;background:#1565C0;color:white;padding:10px;border-radius:4px;font-size:14pt;font-weight:bold;margin-bottom:20px">
      Laudo Técnico de Controle de Pragas e Vetores
    </div>

    <div style="margin-bottom:20px">
      <div style="font-weight:bold;color:#1565C0;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px">DADOS DO CLIENTE</div>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:4px 8px;width:50%"><small style="color:#888">Nome / Razão Social</small><br/>${client?.name || '—'}</td>
          <td style="padding:4px 8px"><small style="color:#888">CPF / CNPJ</small><br/>${client?.document || '—'}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:4px 8px"><small style="color:#888">Endereço</small><br/>${[client?.address, client?.city, client?.state].filter(Boolean).join(', ') || service?.address || '—'}</td>
        </tr>
      </table>
    </div>

    <div style="margin-bottom:20px">
      <div style="font-weight:bold;color:#1565C0;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px">DADOS DO SERVIÇO</div>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:4px 8px;width:50%"><small style="color:#888">Tipo de Serviço</small><br/>${service?.service_type || '—'}</td>
          <td style="padding:4px 8px"><small style="color:#888">Data de Execução</small><br/>${service?.completed_at ? fmtDate(service.completed_at) : fmtDate(new Date().toISOString())}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px"><small style="color:#888">Responsável Técnico</small><br/>${company.responsible_tech || company.settings?.responsible_tech || '—'}</td>
          <td style="padding:4px 8px"><small style="color:#888">CRQ / CREA</small><br/>${company.crq_crea || company.settings?.rt_registry || '—'}</td>
        </tr>
      </table>
      ${(wo.target_pests?.length) ? `
        <div style="margin-top:8px;padding:4px 8px">
          <small style="color:#888">Pragas Controladas</small><br/>
          ${wo.target_pests.map((p: string) => `<span style="display:inline-block;background:#E3F0FB;color:#1565C0;padding:2px 8px;border-radius:12px;margin:2px;font-size:10pt">${p}</span>`).join('')}
        </div>
      ` : ''}
    </div>

    ${(wo.products_used?.length) ? `
    <div style="margin-bottom:20px">
      <div style="font-weight:bold;color:#1565C0;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px">PRODUTOS UTILIZADOS</div>
      <table style="width:100%;border-collapse:collapse;font-size:10pt">
        <thead><tr style="background:#f5f5f5">
          <th style="padding:6px;text-align:left;border:1px solid #ddd">Produto</th>
          <th style="padding:6px;text-align:center;border:1px solid #ddd">Qtd</th>
          <th style="padding:6px;text-align:center;border:1px solid #ddd">Dose</th>
        </tr></thead>
        <tbody>${wo.products_used.map((p: any) => `<tr>
          <td style="padding:6px;border:1px solid #ddd">${p.name || '—'}</td>
          <td style="padding:6px;text-align:center;border:1px solid #ddd">${p.qty || '—'} ${p.unit || ''}</td>
          <td style="padding:6px;text-align:center;border:1px solid #ddd">${p.dose || '—'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    ` : ''}

    ${(wo.areas_treated?.length) ? `
    <div style="margin-bottom:20px">
      <div style="font-weight:bold;color:#1565C0;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px">ÁREAS TRATADAS</div>
      <table style="width:100%;border-collapse:collapse;font-size:10pt">
        <thead><tr style="background:#f5f5f5">
          <th style="padding:6px;text-align:left;border:1px solid #ddd">Área</th>
          <th style="padding:6px;text-align:center;border:1px solid #ddd">m²</th>
          <th style="padding:6px;text-align:center;border:1px solid #ddd">Método</th>
        </tr></thead>
        <tbody>${wo.areas_treated.map((a: any) => `<tr>
          <td style="padding:6px;border:1px solid #ddd">${a.area || '—'}</td>
          <td style="padding:6px;text-align:center;border:1px solid #ddd">${a.sqm || '—'}</td>
          <td style="padding:6px;text-align:center;border:1px solid #ddd">${a.method || '—'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    ` : ''}

    ${wo.tech_notes ? `
    <div style="margin-bottom:20px">
      <div style="font-weight:bold;color:#1565C0;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px">OBSERVAÇÕES</div>
      <p style="white-space:pre-wrap">${wo.tech_notes}</p>
    </div>
    ` : ''}

    <div style="background:#f0f7ff;padding:12px;border-radius:4px;margin-bottom:24px;text-align:center">
      <strong>Validade do Laudo:</strong> Este documento tem validade até <strong>${validUntil.split('-').reverse().join('/')}</strong>.
    </div>

    <div style="display:flex;justify-content:space-around;margin-top:40px;padding-top:20px">
      <div style="text-align:center;width:40%">
        <div style="border-top:1px solid #333;padding-top:8px;margin-top:60px">
          ${company.responsible_tech || company.settings?.responsible_tech || 'Responsável Técnico'}
        </div>
        <div style="font-size:9pt;color:#888">${company.crq_crea || company.settings?.rt_registry ? `CRQ/CREA: ${company.crq_crea || company.settings?.rt_registry}` : ''}</div>
      </div>
      <div style="text-align:center;width:40%">
        <div style="border-top:1px solid #333;padding-top:8px;margin-top:60px">
          ${client?.name || 'Cliente'}
        </div>
        <div style="font-size:9pt;color:#888">Assinatura do cliente</div>
      </div>
    </div>

    <div style="text-align:center;margin-top:30px;font-size:8pt;color:#999;border-top:1px solid #eee;padding-top:8px">
      Laudo emitido via PragaZero — Sistema de Gestão para Controle de Pragas
    </div>
  `;
}

export async function generateReportPDF(input: ReportInput): Promise<string> {
  const { wo, service, client, company } = input;

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white;font-family:Arial,sans-serif;font-size:11pt;padding:40px;color:#1a1a1a;';
  container.innerHTML = buildLaudoHTML(wo, service, client, company);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgW = 210;
    const imgH = (canvas.height * imgW) / canvas.width;
    const pageH = 297;

    if (imgH <= pageH) {
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH);
    } else {
      let position = 0;
      let remaining = imgH;
      while (remaining > 0) {
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgW, imgH);
        remaining -= pageH;
        position -= pageH;
        if (remaining > 0) pdf.addPage();
      }
    }

    const pdfBlob = pdf.output('blob');
    const path = `${wo.company_id}/reports/${wo.id}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from('reports')
      .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true });
    if (uploadErr) throw uploadErr;

    const validityDate = calcValidUntil(service.service_type);

    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('service_id', wo.service_id)
      .maybeSingle();

    let reportId: string;

    if (existing?.id) {
      await supabase.from('reports').update({
        content: { pdf_path: path } as any,
        status: 'draft',
        validity_date: validityDate,
        responsible_tech: company.responsible_tech || company.settings?.responsible_tech || null,
        rt_registry: company.crq_crea || company.settings?.rt_registry || null,
      }).eq('id', existing.id);
      reportId = existing.id;
    } else {
      const { data: newReport, error } = await supabase.from('reports').insert({
        company_id: wo.company_id,
        service_id: wo.service_id,
        client_id: (client as any)?.id || null,
        content: { pdf_path: path } as any,
        status: 'draft',
        validity_date: validityDate,
        responsible_tech: company.responsible_tech || company.settings?.responsible_tech || null,
        rt_registry: company.crq_crea || company.settings?.rt_registry || null,
      }).select('id').single();
      if (error) throw error;
      reportId = newReport!.id;
    }

    return reportId;
  } finally {
    document.body.removeChild(container);
  }
}
