import { JSDOM } from 'jsdom';



interface HTMLAnchorElement {
  id?: string | number;

  [key: string]: unknown;
}interface HTMLAnchorElement {id?: string | number;[key: string]: unknown;}export interface DownloadLink {url: string;label: string;isTrusted: boolean;}const trustedPatterns = [{ name: "Pub-Dev", regex: /pub-.*?\.dev/i }, { name: "FSL Server", regex: /fsl\.gigabytes\.click/i }];

function transformPixeldrainUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.endsWith('pixeldrain.com') && urlObj.pathname.startsWith('/u/')) {
      const fileId = urlObj.pathname.split('/u/')[1];
      return `https://pixeldrain.com/api/file/${fileId}`;
    }
  } catch (e) {

  }
  return url;
}
function replaceBrandingText(text: string): string {
  return text.replace(/N-Cloud|Hub-Cloud|V-Cloud/gi, 'StreamScout');
}
export async function processUrl(url: string): Promise<DownloadLink[]> {

  const response1 = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
  });
  if (!response1.ok) throw new Error(`Failed to fetch initial URL (status: ${response1.status})`);
  const html1 = await response1.text();

  let finalUrl: string | null = null;
  const jsVarRegex = /var\s+url\s*=\s*'(.*?)'/;
  const jsMatch = html1.match(jsVarRegex);
  if (jsMatch && jsMatch[1]) {
    finalUrl = jsMatch[1];
  } else {
    const dom1 = new JSDOM(html1);
    const linkElement = dom1.window.document.querySelector('a[href*="token="]') as HTMLAnchorElement | null;
    if (linkElement) {
      let hrefValue = linkElement.getAttribute('href') || '';
      if (hrefValue.startsWith('/')) {
        const baseUrl = new URL(url);
        finalUrl = `${baseUrl.protocol}//${baseUrl.hostname}${hrefValue}`;
      } else {
        finalUrl = hrefValue;
      }
    }
  }
  if (!finalUrl) {
    throw new Error("Could not find the tokenized URL");
  }

  const response2 = await fetch(finalUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
  });
  if (!response2.ok) throw new Error(`Failed to fetch download page (status: ${response2.status})`);
  const html2 = await response2.text();

  const dom2 = new JSDOM(html2);
  const allLinks = Array.from(dom2.window.document.querySelectorAll("a.btn"));
  const links: DownloadLink[] = [];
  allLinks.forEach((link) => {
    const linkElement = link as HTMLAnchorElement;
    const linkText = linkElement.textContent?.trim() || "";
    if (linkText.toLowerCase().includes("telegram")) return;
    const extractedUrl = transformPixeldrainUrl(linkElement.href);
    const hostMatch = trustedPatterns.find((p) => p.regex.test(extractedUrl));
    const bracketMatch = linkText.match(/\[(.*?)\]/);
    const shortText = bracketMatch && bracketMatch[1] ? bracketMatch[1].trim() : linkText.replace(/\s+/g, " ");
    links.push({
      url: extractedUrl,
      label: replaceBrandingText(shortText),
      isTrusted: !!hostMatch
    });
  });
  if (links.length === 0) {
    throw new Error("No valid download links found after filtering");
  }

  return [
  ...links.filter((l) => l.isTrusted),
  ...links.filter((l) => !l.isTrusted)];

}