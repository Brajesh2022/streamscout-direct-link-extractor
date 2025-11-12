import { load } from 'cheerio';
import type { DownloadLink, ProcessUrlResponse } from '@shared/types';
const trustedPatterns = [
  { name: "Pub-Dev", regex: /pub-.*?\.dev/i },
  { name: "FSL Server", regex: /fsl\.gigabytes\.click/i }
];
function transformPixeldrainUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.endsWith('pixeldrain.com') && urlObj.pathname.startsWith('/u/')) {
      const fileId = urlObj.pathname.split('/u/')[1];
      return `https://pixeldrain.com/api/file/${fileId}`;
    }
  } catch (e) {
    // Ignore invalid URLs
  }
  return url;
}
function replaceBrandingText(text: string): string {
  return text.replace(/N-Cloud|Hub-Cloud|V-Cloud/gi, 'StreamScout');
}
export async function processUrl(url: string): Promise<ProcessUrlResponse> {
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
    const $1 = load(html1);
    const linkElement = $1('a[href*="token="]').first();
    if (linkElement.length > 0) {
      let hrefValue = linkElement.attr('href') || '';
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
  const $2 = load(html2);
  const pageTitle = $2('title').text() || '';
  const isZipFile = pageTitle.toLowerCase().endsWith('.zip');
  const allLinks = $2("a.btn");
  const links: DownloadLink[] = [];
  allLinks.each((_, link) => {
    const linkElement = $2(link);
    const linkText = linkElement.text()?.trim() || "";
    if (linkText.toLowerCase().includes("telegram")) return;
    const extractedUrl = transformPixeldrainUrl(linkElement.attr('href') || '');
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
  const sortedLinks = [
    ...links.filter((l) => l.isTrusted),
    ...links.filter((l) => !l.isTrusted)
  ];
  return {
    links: sortedLinks,
    pageTitle,
    isZipFile,
  };
}