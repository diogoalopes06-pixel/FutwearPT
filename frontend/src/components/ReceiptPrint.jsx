import React from "react";
import { Instagram, Truck, UserRound, Package, Ticket, PenLine, MessageCircle, ShieldCheck, Star } from "lucide-react";

const INSTAGRAM_URL = "https://www.instagram.com/futwearpt/";

const money = (value) => `€ ${Number(value || 0).toFixed(2).replace(".", ",")}`;
const dateText = (value) => new Date(value || Date.now()).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
const first = (value, fallback = "—") => value ? String(value) : fallback;

export default function ReceiptPrint({ order }) {
  if (!order) return null;
  const reference = `#FWPT-${String(order.id || "").slice(0, 8).toUpperCase()}`;
  const shipping = Number(order.shipping_fee || 0);
  const discount = Number(order.discount || 0);
  const total = Number(order.total || 0);
  const taxRate = order.tax_rate ?? order.vat_rate;
  const address = order.address || order.shipping_address || "Envio para Portugal";

  return (
    <div className="fw-receipt-print">
      <style>{`
        .fw-receipt-print{display:none}
        @media print{
          @page{size:A4;margin:0}
          html,body{background:#fff!important;color:#101820!important}
          body *{visibility:hidden!important}
          .fw-receipt-print,.fw-receipt-print *{visibility:visible!important}
          .fw-receipt-print{display:block!important;position:absolute;left:0;top:0;width:210mm;min-height:297mm;background:#fff;color:#101820;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;padding:13mm 12mm 10mm;overflow:hidden}
        }
        .fw-rp{min-height:274mm;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;color:#101820}
        .fw-rp *{box-sizing:border-box}
        .fw-rp-head{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:8mm;border-bottom:1px solid #202830}
        .fw-rp-brand{display:flex;align-items:center;gap:5mm}
        .fw-rp-logo{width:25mm;height:25mm;object-fit:contain}
        .fw-rp-brand-name{font-size:22pt;line-height:1;font-weight:900;letter-spacing:1.5px}.fw-rp-brand-name span{color:#e10600}
        .fw-rp-tag{font-size:7pt;letter-spacing:3px;color:#506070;margin-top:3mm;text-transform:uppercase}
        .fw-rp-title{text-align:right}.fw-rp-title h1{font-size:13pt;letter-spacing:1.5px;margin:0 0 2mm;font-weight:700}.fw-rp-ref{font-size:13pt;font-weight:900;margin-bottom:3mm}.fw-rp-meta{font-size:8.5pt;color:#506070;line-height:1.8}.fw-rp-status{display:inline-block;background:#e10600;color:#fff;border-radius:2mm;padding:1.8mm 3.5mm;font-size:7.5pt;font-weight:800;letter-spacing:.4px}
        .fw-rp-columns{display:grid;grid-template-columns:1fr 1fr;margin-top:7mm;border-bottom:1px solid #dce2e7;padding-bottom:6mm}.fw-rp-col:first-child{border-right:1px solid #dce2e7;padding-right:7mm}.fw-rp-col:last-child{padding-left:7mm}
        .fw-rp-section-title{display:flex;align-items:center;gap:3mm;font-size:9pt;font-weight:900;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5mm}.fw-rp-icon{width:9mm;height:9mm;border-radius:50%;background:#101820;color:#fff;display:grid;place-items:center;flex:none}.fw-rp-label{font-size:7.5pt;color:#506070;margin-top:3mm}.fw-rp-value{font-size:9pt;line-height:1.45;margin-top:1mm}.fw-rp-info-row{display:flex;align-items:center;gap:3mm;background:#f5f7f8;border-radius:2mm;padding:3mm;margin-bottom:2.5mm;font-size:8.5pt}.fw-rp-info-row svg{flex:none}.fw-rp-info-row small{display:block;color:#506070;font-size:7.5pt;margin-top:.5mm}
        .fw-rp-products{margin-top:7mm}.fw-rp-table{border:1px solid #d7dee4;border-radius:2mm;overflow:hidden}.fw-rp-th,.fw-rp-tr{display:grid;grid-template-columns:minmax(0,1fr) 20mm 23mm 30mm 28mm}.fw-rp-th{background:#f1f4f6;font-size:7.5pt;font-weight:900;padding:4mm 3mm}.fw-rp-tr{min-height:28mm;font-size:8.5pt;border-top:1px solid #e0e5e9}.fw-rp-cell{padding:4mm 3mm;border-left:1px solid #e0e5e9;display:flex;align-items:center}.fw-rp-cell:first-child{border-left:0}.fw-rp-product{display:flex;gap:4mm;align-items:center}.fw-rp-product-img{width:20mm;height:22mm;object-fit:contain;background:#f5f6f7;border-radius:2mm}.fw-rp-product-name{font-weight:800}.fw-rp-product-sub{font-size:7.5pt;color:#506070;margin-top:1.5mm}.fw-rp-center{justify-content:center}.fw-rp-right{justify-content:flex-end;text-align:right}.fw-rp-bottom{display:grid;grid-template-columns:1fr 82mm;gap:7mm;margin-top:7mm}.fw-rp-note{background:#f5f7f8;border-radius:2mm;padding:5mm}.fw-rp-note p{font-size:8.5pt;line-height:1.5;color:#344452;margin:0}.fw-rp-totals{background:#f3f5f6;border-radius:2mm;padding:5mm}.fw-rp-total-line{display:flex;justify-content:space-between;font-size:9pt;padding:1.5mm 0}.fw-rp-total-line.muted{color:#506070}.fw-rp-grand{border-top:1px solid #aeb8c0;margin-top:2mm;padding-top:3mm;font-size:15pt;font-weight:900}.fw-rp-grand span:last-child{font-size:16pt}.fw-rp-tax{font-size:7pt;color:#506070;margin-top:1mm}
        .fw-rp-services{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid #dce2e7;border-bottom:1px solid #dce2e7;margin-top:auto;padding:6mm 0}.fw-rp-service{display:flex;gap:3mm;align-items:center;padding:0 5mm;border-right:1px solid #dce2e7}.fw-rp-service:first-child{padding-left:0}.fw-rp-service:last-child{border-right:0}.fw-rp-service svg{flex:none}.fw-rp-service b{display:block;font-size:8pt;text-transform:uppercase}.fw-rp-service span{display:block;font-size:7pt;color:#506070;margin-top:1mm}
        .fw-rp-footer{display:flex;justify-content:space-between;align-items:flex-end;padding-top:6mm}.fw-rp-footer-brand{font-size:11pt;font-weight:900}.fw-rp-footer-brand small{display:block;font-size:7pt;color:#506070;font-weight:400;margin-top:1.5mm}.fw-rp-social{font-size:8pt}.fw-rp-social a{color:#101820;text-decoration:none}.fw-rp-thanks{text-align:right;font-family:cursive;font-size:21pt;font-style:italic;transform:rotate(-5deg)}.fw-rp-thanks:after{content:"";display:block;width:34mm;height:1px;background:#101820;margin-left:auto;margin-top:-1mm}
        .fw-rp-red-corner{position:absolute;left:0;bottom:0;width:25mm;height:25mm;background:#e10600;clip-path:polygon(0 0,100% 100%,0 100%)}
      `}</style>
      <div className="fw-rp">
        <header className="fw-rp-head">
          <div className="fw-rp-brand">
            <img className="fw-rp-logo" src="/futwearpt-logo-transparent.png" alt="FutWearPT" />
            <div><div className="fw-rp-brand-name">FUTWEAR<span>PT</span></div><div className="fw-rp-tag">Football Shirts · Custom · More</div></div>
          </div>
          <div className="fw-rp-title"><h1>TALÃO DE ENCOMENDA</h1><div className="fw-rp-ref">{reference}</div><div className="fw-rp-meta">Data de emissão: {dateText(order.created_at)}<br />Estado: <span className="fw-rp-status">A AGUARDAR PAGAMENTO</span></div></div>
        </header>

        <section className="fw-rp-columns">
          <div className="fw-rp-col">
            <div className="fw-rp-section-title"><span className="fw-rp-icon"><UserRound size={15}/></span>Dados do cliente</div>
            <div className="fw-rp-label">Nome</div><div className="fw-rp-value">{first(order.customer_name)}</div>
            <div className="fw-rp-label">Email</div><div className="fw-rp-value">{first(order.email || order.customer_email)}</div>
            {order.phone && <><div className="fw-rp-label">Telefone</div><div className="fw-rp-value">{order.phone}</div></>}
            <div className="fw-rp-label">Morada de envio</div><div className="fw-rp-value">{address}</div>
          </div>
          <div className="fw-rp-col">
            <div className="fw-rp-section-title"><span className="fw-rp-icon"><Package size={15}/></span>Informações da encomenda</div>
            <div className="fw-rp-info-row"><Truck size={17}/><div>Envio para Portugal<small>{order.shipping_method || "Entrega"}</small></div></div>
            <div className="fw-rp-info-row"><Instagram size={17}/><div>Pagamento por Instagram<small>@futwearpt</small></div></div>
            <div className="fw-rp-info-row"><Ticket size={17}/><div>Cupão aplicado<small>{order.coupon_code || "Não utilizado"}</small></div></div>
            <div className="fw-rp-info-row"><PenLine size={17}/><div>Personalização<small>{order.items?.some(i => i.custom_name || i.custom_number) ? "Sim" : "Não"}</small></div></div>
            <div className="fw-rp-info-row"><MessageCircle size={17}/><div>Observações<small>{order.notes || "—"}</small></div></div>
          </div>
        </section>

        <section className="fw-rp-products">
          <div className="fw-rp-section-title"><span className="fw-rp-icon">♟</span>Produtos</div>
          <div className="fw-rp-table">
            <div className="fw-rp-th"><div>Produto</div><div className="fw-rp-center">Tamanho</div><div className="fw-rp-center">Quantidade</div><div className="fw-rp-right">Preço Unitário</div><div className="fw-rp-right">Total</div></div>
            {(order.items || []).map((it, i) => <div className="fw-rp-tr" key={i}>
              <div className="fw-rp-cell"><div className="fw-rp-product">{(it.image || it.image_url || it.imageUrl) ? <img className="fw-rp-product-img" src={it.image || it.image_url || it.imageUrl} alt="" /> : <div className="fw-rp-product-img"/>}<div><div className="fw-rp-product-name">{it.name}</div><div className="fw-rp-product-sub">{it.custom_name || it.custom_number ? `Personalizada${it.custom_name ? ` · ${it.custom_name}` : ""}${it.custom_number ? ` #${it.custom_number}` : ""}` : "Equipamento FutWearPT"}</div></div></div></div>
              <div className="fw-rp-cell fw-rp-center">{it.size || "—"}</div><div className="fw-rp-cell fw-rp-center">{it.quantity}</div><div className="fw-rp-cell fw-rp-right">{money(it.price)}</div><div className="fw-rp-cell fw-rp-right">{money(Number(it.price || 0) * Number(it.quantity || 0))}</div>
            </div>)}
          </div>
        </section>

        <section className="fw-rp-bottom">
          <div className="fw-rp-note"><div className="fw-rp-section-title"><span className="fw-rp-icon"><MessageCircle size={15}/></span>Informações adicionais</div><p>A tua encomenda será processada assim que confirmarmos o pagamento. Envia-nos uma mensagem pelo Instagram <strong>@futwearpt</strong> para combinar o pagamento.</p><p style={{marginTop:"3mm"}}>A encomenda permanece <strong>A aguardar pagamento</strong> até à confirmação manual.</p></div>
          <div className="fw-rp-totals"><div className="fw-rp-total-line"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>{shipping > 0 && <div className="fw-rp-total-line"><span>Envio</span><span>{money(shipping)}</span></div>}{discount > 0 && <div className="fw-rp-total-line muted"><span>Desconto</span><span>− {money(discount)}</span></div>}<div className="fw-rp-total-line fw-rp-grand"><span>Total</span><span>{money(total)}</span></div><div className="fw-rp-tax">{taxRate ? `IVA incluído (${taxRate}%)` : "Total final da encomenda"}</div></div>
        </section>

        <section className="fw-rp-services"><div className="fw-rp-service"><ShieldCheck size={22}/><div><b>Compra segura</b><span>Os teus dados estão protegidos.</span></div></div><div className="fw-rp-service"><Truck size={22}/><div><b>Envio rápido</b><span>Entregas em todo o Portugal.</span></div></div><div className="fw-rp-service"><Star size={22}/><div><b>Qualidade garantida</b><span>A tua satisfação é a nossa prioridade.</span></div></div></section>
        <footer className="fw-rp-footer"><div className="fw-rp-footer-brand">FUTWEARPT<small>Football Shirts · Custom · More</small></div><div className="fw-rp-social"><Instagram size={15} style={{verticalAlign:"middle",marginRight:5}}/><a href={INSTAGRAM_URL}>@futwearpt</a></div><div className="fw-rp-thanks">Obrigado!</div></footer>
      </div>
      <div className="fw-rp-red-corner" />
    </div>
  );
}
