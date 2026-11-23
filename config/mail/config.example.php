<?php
declare(strict_types=1);
return [
    'enabled' => false,
    'allowed_origins' => ['https://polyd-system.ru', 'https://www.polyd-system.ru'],
    'smtp_host' => '',
    'smtp_port' => 587,
    'smtp_user' => '',
    'smtp_password' => '',
    'smtp_encryption' => 'tls',
    'from_email' => '',
    'to_email' => 'polyd-system@mail.ru',
    'archive_email' => '',
    'policy_revision' => '2026-11-23',
    'consent_revision' => '2026-11-23',
    'rate_limit_count' => 5,
    'rate_limit_window' => 600,
    'rate_secret' => '',
];
