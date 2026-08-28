// PDF generation from HTML quotation templates using html2canvas + jsPDF.
// Renders the template HTML in a hidden iframe, captures it, and splits across A4 pages.

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

function waitForImages(doc) {
  return new Promise((resolve) => {
    const imgs = doc.querySelectorAll("img");
    let remaining = imgs.length;
    if (remaining === 0) { resolve(); return; }
    imgs.forEach((img) => {
      if (img.complete) {
        remaining--;
        if (remaining === 0) resolve();
      } else {
        img.onload = () => { remaining--; if (remaining === 0) resolve(); };
        img.onerror = () => { remaining--; if (remaining === 0) resolve(); };
      }
    });
    setTimeout(resolve, 5000);
  });
}

export async function generateTemplatePdf(html, { filename = "quotation.pdf", returnBlob = false } = {}) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:1200px;height:1600px;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();

    await waitForImages(doc);
    await new Promise((r) => setTimeout(r, 300));

    const target = doc.querySelector(".quotation-page") || doc.querySelector(".quotation") || doc.body;
    target.style.background = "#ffffff";

    const captureWidth = target.offsetWidth || 1120;

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: captureWidth,
      windowWidth: captureWidth + 100,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = 210;
    const pageH = 297;
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    let heightLeft = imgH;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
    heightLeft -= pageH;

    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
    }

    if (returnBlob) {
      return { url: pdf.output("bloburl"), filename };
    }
    pdf.save(filename);
    return true;
  } finally {
    document.body.removeChild(iframe);
  }
}