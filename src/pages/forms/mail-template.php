<?php
declare(strict_types=1);
function polydMailHtml(string $body): string {
    $safe = nl2br(htmlspecialchars($body, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
    return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Обращение POLYD</title></head><body style="margin:0;background:#f3f1ec;color:#202627;font-family:Arial,sans-serif"><table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="padding:24px 16px"><table role="presentation" style="width:100%;max-width:640px;margin:auto;border-collapse:collapse"><tr><td style="background:#1d2526;color:#f5f5ef;padding:28px;font-size:24px">DOSINGS · POLYD</td></tr><tr><td style="background:#fffef8;padding:28px;font-size:16px;line-height:1.7;overflow-wrap:anywhere">' . $safe . '</td></tr><tr><td style="padding:24px 28px;font-size:13px;line-height:1.7">ООО «ВК-КОМПЛЕКТ»<br><a href="https://polyd-system.ru/">polyd-system.ru</a><br>+7 (4852) 71-73-43</td></tr></table></td></tr></table></body></html>';
}
