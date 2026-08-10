import { render } from '@react-email/render';
import { template } from './src/lib/email-templates/member-claim-invitation';

const html = await render(template.component(template.previewData));
const wrapped = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body style="margin:0;padding:24px;background:#f3f4f6;">${html}</body></html>`;
await Bun.write('/tmp/browser/email-preview.html', wrapped);
console.log('rendered');
