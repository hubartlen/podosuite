import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { to, facture, patient, pdfBase64 } = await request.json()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PodoSuite <onboarding@resend.dev>',
        to: [to],
        subject: `Facture ${facture.numero} — Cabinet Arthur Le Neué`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2563eb; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">Cabinet de podologie</h1>
              <p style="color: #bfdbfe; margin: 4px 0 0;">Arthur Le Neué — Pédicure Podologue DE</p>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="color: #334155; font-size: 15px;">Bonjour ${patient.prenom} ${patient.nom},</p>
              <p style="color: #334155; font-size: 15px;">Veuillez trouver ci-joint votre facture <strong>${facture.numero}</strong> d'un montant de <strong>${facture.total.toFixed(2)} €</strong>.</p>
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #64748b; font-size: 13px;">Facture N°</p>
                <p style="margin: 4px 0 0; color: #1e293b; font-size: 16px; font-weight: bold;">${facture.numero}</p>
                <p style="margin: 12px 0 0; color: #64748b; font-size: 13px;">Date</p>
                <p style="margin: 4px 0 0; color: #1e293b;">${new Date(facture.date_facture).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p style="margin: 12px 0 0; color: #64748b; font-size: 13px;">Montant</p>
                <p style="margin: 4px 0 0; color: #1e293b; font-size: 18px; font-weight: bold;">${facture.total.toFixed(2)} €</p>
                <p style="margin: 12px 0 0; color: #64748b; font-size: 13px;">Mode de paiement</p>
                <p style="margin: 4px 0 0; color: #1e293b;">${facture.mode_paiement}</p>
              </div>
              <p style="color: #64748b; font-size: 13px;">N'hésitez pas à me contacter pour toute question.</p>
              <p style="color: #334155; font-size: 15px; margin-top: 24px;">Cordialement,<br><strong>Arthur Le Neué</strong><br>Pédicure Podologue DE<br>4 rue saint Just, 93210 La Plaine Saint Denis<br>06 89 40 51 05</p>
            </div>
          </div>
        `,
        attachments: pdfBase64 ? [{
          filename: `Facture_${facture.numero}.pdf`,
          content: pdfBase64,
        }] : [],
      })
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
  }
}
