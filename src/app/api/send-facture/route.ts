import { NextResponse } from 'next/server'
import { SIGNATURE_B64 } from '@/lib/signature'

export async function POST(request: Request) {
  try {
    const { to, facture, patient, pdfBase64 } = await request.json()

    const dateFormatted = new Date(facture.date_facture).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? 'Arthur Le Neue <onboarding@resend.dev>',
        to: [to],
        subject: `Facture ${facture.numero} — Cabinet Arthur Le Neué`,
        html: buildFactureHtml(patient, facture, dateFormatted),
        attachments: pdfBase64
          ? [{ filename: `Facture_${facture.numero}.pdf`, content: pdfBase64 }]
          : [],
      }),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.error('Resend error:', body)
      return NextResponse.json(
        { error: (body as any).message ?? (body as any).name ?? 'Erreur Resend' },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('send-facture:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function buildFactureHtml(patient: any, facture: any, dateFormatted: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f5f2ee;font-family:Arial,sans-serif;">
<div style="max-width:580px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2dbd0;">

  <div style="background:#1a1410;padding:28px 32px;">
    <div style="font-family:Georgia,serif;font-size:22px;color:#c8b89a;letter-spacing:0.02em;">Cabinet de Podologie</div>
    <div style="font-size:13px;color:#9b8f7e;margin-top:4px;">Arthur Le Neué — Pédicure Podologue DE</div>
  </div>

  <div style="padding:28px 32px;">
    <p style="color:#1a1410;font-size:15px;margin:0 0 14px;">Bonjour ${patient.prenom} ${patient.nom},</p>
    <p style="color:#4a3f35;font-size:15px;margin:0 0 24px;">Veuillez trouver ci-joint votre facture <strong>${facture.numero}</strong> d'un montant de <strong>${facture.total.toFixed(2)}&nbsp;€</strong>.</p>

    <div style="background:#f9f7f4;border:1px solid #e2dbd0;border-radius:10px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="font-size:11px;color:#9b8f7e;text-transform:uppercase;letter-spacing:.05em;padding-bottom:4px;">Facture N°</td>
          <td style="font-size:11px;color:#9b8f7e;text-transform:uppercase;letter-spacing:.05em;padding-bottom:4px;padding-left:24px;">Date</td>
        </tr>
        <tr>
          <td style="font-size:15px;font-weight:bold;color:#1a1410;padding-bottom:16px;">${facture.numero}</td>
          <td style="font-size:14px;color:#4a3f35;padding-bottom:16px;padding-left:24px;">${dateFormatted}</td>
        </tr>
        <tr>
          <td style="font-size:11px;color:#9b8f7e;text-transform:uppercase;letter-spacing:.05em;padding-bottom:4px;">Montant</td>
          <td style="font-size:11px;color:#9b8f7e;text-transform:uppercase;letter-spacing:.05em;padding-bottom:4px;padding-left:24px;">Paiement</td>
        </tr>
        <tr>
          <td style="font-size:20px;font-weight:bold;color:#1a1410;">${facture.total.toFixed(2)}&nbsp;€</td>
          <td style="font-size:14px;color:#4a3f35;padding-left:24px;">${facture.mode_paiement}</td>
        </tr>
      </table>
    </div>

    <p style="color:#9b8f7e;font-size:13px;margin:0 0 28px;">N'hésitez pas à me contacter pour toute question.</p>

    <div style="border-top:1px solid #e2dbd0;padding-top:20px;">
      <img src="${SIGNATURE_B64}" alt="Signature Arthur Le Neué" style="max-height:72px;max-width:200px;display:block;margin-bottom:12px;" />
      <div style="font-size:14px;font-weight:bold;color:#1a1410;">Arthur Le Neué</div>
      <div style="font-size:13px;color:#4a3f35;margin-top:2px;">Pédicure Podologue DE</div>
      <div style="font-size:12px;color:#9b8f7e;margin-top:6px;">4 rue Saint-Just, 93210 La Plaine Saint-Denis</div>
      <div style="font-size:12px;color:#9b8f7e;">06 89 40 51 05</div>
    </div>
  </div>

</div>
</body>
</html>`
}
