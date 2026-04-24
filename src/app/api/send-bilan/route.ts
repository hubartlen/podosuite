import { NextResponse } from 'next/server'
import { SIGNATURE_B64 } from '@/lib/signature'

export async function POST(request: Request) {
  try {
    const { to, bilan, patient, pdfBase64 } = await request.json()

    const dateBilan = new Date(bilan.date_bilan).toLocaleDateString('fr-FR', {
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
        subject: `Bilan podologique du ${dateBilan} — Cabinet Arthur Le Neué`,
        html: buildBilanHtml(patient, dateBilan),
        attachments: pdfBase64
          ? [{ filename: `Bilan_${patient.nom}_${patient.prenom}_${bilan.date_bilan}.pdf`, content: pdfBase64 }]
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
    console.error('send-bilan:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function buildBilanHtml(patient: any, dateBilan: string) {
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
    <p style="color:#4a3f35;font-size:15px;margin:0 0 24px;">Veuillez trouver ci-joint votre bilan podologique du <strong>${dateBilan}</strong>.</p>
    <p style="color:#9b8f7e;font-size:13px;margin:0 0 28px;">N'hésitez pas à me contacter pour toute question concernant votre suivi.</p>

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
