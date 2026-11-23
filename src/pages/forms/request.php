<?php
declare(strict_types=1);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function respond(int $status, string $message, array $fields = []): never {
    http_response_code($status);
    echo json_encode(['ok' => $status === 200, 'message' => $message, 'fields' => $fields], JSON_UNESCAPED_UNICODE);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, 'Используйте форму обращения на сайте');
}
$config = require __DIR__ . '/private/config.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!is_string($origin) || !in_array($origin, $config['allowed_origins'] ?? [], true)) respond(403, 'Откройте форму на сайте POLYD');
$contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 12 * 1024 * 1024) respond(413, 'До 3 файлов: не более 5 МБ каждый и 10 МБ суммарно');
if ($contentType === 'multipart/form-data') {
    if (!$_POST && !$_FILES) respond(413, 'Не удалось загрузить файлы. До 3 файлов, до 5 МБ каждый и 10 МБ суммарно');
    $data = $_POST;
    $data['consent'] = ($data['consent'] ?? '') === 'true';
} elseif ($contentType === 'application/json') {
    $raw = file_get_contents('php://input', false, null, 0, 32769);
    if ($raw === false || strlen($raw) > 32768) respond(413, 'Сократите описание задачи');
    try { $data = json_decode($raw, true, 16, JSON_THROW_ON_ERROR); } catch (Throwable $error) { respond(400, 'Проверьте заполнение формы'); }
} else respond(415, 'Не удалось прочитать обращение');
if (!is_array($data)) respond(400, 'Проверьте заполнение формы');
$length = static fn(string $value): int => function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : preg_match_all('/./us', $value);
$text = static fn(string $key): string => isset($data[$key]) && is_string($data[$key]) ? trim($data[$key]) : '';
$message = $text('message'); $reply = $text('reply'); $model = $text('model');
$formKind = $text('formKind') === 'callback' ? 'Заказ обратного звонка' : 'Задача для инженера';
$pagePath = $text('page');
if (!preg_match('~^/(?:[a-z0-9-]+\.html)?$~', $pagePath)) $pagePath = '/';
$fields = [];
if ($message === '' || $length($message) > 5000) $fields['message'] = 'Опишите задачу: не более 5000 символов';
if ($reply === '' || $length($reply) > 200 || preg_match('/[\r\n\x00]/', $reply)) $fields['reply'] = 'Укажите e-mail или телефон для ответа';
$digits = preg_replace('/\D/', '', $reply);
if (!filter_var($reply, FILTER_VALIDATE_EMAIL) && (!preg_match('/^\+?[\d\s().-]{7,30}$/', $reply) || strlen($digits) < 7 || strlen($digits) > 20)) $fields['reply'] = 'Проверьте e-mail или телефон';
if (!in_array($model, ['Помогите выбрать', 'POLYD PLA', 'POLYD TWIN'], true)) $fields['model'] = 'Выберите оборудование из списка';
if (($data['consent'] ?? false) !== true || $text('consentRevision') !== ($config['consent_revision'] ?? '')) $fields['consent'] = 'Подтвердите согласие на обработку данных';
if ($fields) respond(400, 'Проверьте отмеченные поля', $fields);
require __DIR__ . '/private/attachments.php';
$attachments = polydAttachments($_FILES);
if (empty($config['enabled']) || empty($config['smtp_host']) || empty($config['from_email']) || empty($config['archive_email']) || empty($config['rate_secret'])) respond(503, 'Отправка через сайт пока недоступна. Данные и вложения остались в форме. Напишите на polyd-system@mail.ru или позвоните нам');
require __DIR__ . '/private/phpmailer/Exception.php';
require __DIR__ . '/private/phpmailer/PHPMailer.php';
require __DIR__ . '/private/phpmailer/SMTP.php';
require __DIR__ . '/private/mail-template.php';
use PHPMailer\PHPMailer\PHPMailer;
$key = hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $config['rate_secret']);
$rateDir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . '/polyd-form-rate';
if (!is_dir($rateDir) && !mkdir($rateDir, 0700, true) && !is_dir($rateDir)) respond(503, 'Не удалось проверить отправку. Напишите нам по электронной почте');
foreach (glob($rateDir . '/*') ?: [] as $stale) {
    if (is_file($stale) && filemtime($stale) < time() - max(3600, (int)$config['rate_limit_window'])) @unlink($stale);
}
$rateFile = $rateDir . '/' . $key;
$handle = fopen($rateFile, 'c+');
if (!$handle || !flock($handle, LOCK_EX)) respond(503, 'Сервис отправки временно недоступен');
$times = json_decode(stream_get_contents($handle) ?: '[]', true);
$window = max(1, (int)$config['rate_limit_window']);
$times = array_values(array_filter(is_array($times) ? $times : [], static fn($time): bool => is_int($time) && $time > time() - $window));
if (count($times) >= (int)$config['rate_limit_count']) {
    $retry = max(1, $times[0] + $window - time());
    flock($handle, LOCK_UN); fclose($handle); header('Retry-After: ' . $retry);
    respond(429, 'Слишком много попыток. Подождите и повторите отправку');
}
$times[] = time(); rewind($handle); ftruncate($handle, 0); fwrite($handle, json_encode($times)); fflush($handle); flock($handle, LOCK_UN); fclose($handle);
$requestId = $text('requestId');
if (!preg_match('/^[a-f0-9-]{36}$/i', $requestId)) respond(400, 'Обновите страницу и повторите заполнение формы');
$operation = fopen($rateDir . '/op-' . hash_hmac('sha256', $requestId, $config['rate_secret']), 'c+');
if (!$operation || !flock($operation, LOCK_EX)) respond(503, 'Не удалось проверить отправку');
$previous = trim(stream_get_contents($operation) ?: '');
if ($previous === 'sent') { flock($operation, LOCK_UN); fclose($operation); respond(200, 'Почтовый сервер уже принял это письмо'); }
if ($previous !== '') { flock($operation, LOCK_UN); fclose($operation); respond(409, 'Результат предыдущей отправки не подтверждён. Уточните получение по телефону'); }
rewind($operation); fwrite($operation, 'pending'); fflush($operation);
$date = new DateTimeImmutable('now', new DateTimeZone('Europe/Moscow'));
$body = "Обращение по POLYD\nФорма: $formKind\nСтраница: https://polyd-system.ru$pagePath\nДата и время: " . $date->format('Y-m-d H:i:s P') . "\nОборудование: $model\nКонтакт для ответа: $reply\n\n$message\n\nСогласие на обработку персональных данных: подтверждено\nРедакция согласия: " . $config['consent_revision'] . "\nПолитика: https://polyd-system.ru/privacy.html\nРедакция политики: " . $config['policy_revision'];
try {
    $mail = new PHPMailer(true); $mail->isSMTP(); $mail->Host = $config['smtp_host']; $mail->Port = (int)$config['smtp_port'];
    $mail->SMTPAuth = true; $mail->Username = $config['smtp_user']; $mail->Password = $config['smtp_password'];
    $mail->SMTPSecure = $config['smtp_encryption']; $mail->Timeout = 20; $mail->CharSet = 'UTF-8'; $mail->XMailer = '';
    $mail->setFrom($config['from_email'], 'POLYD'); $mail->addAddress($config['to_email']); $mail->addBCC($config['archive_email']);
    if (PHPMailer::validateAddress($reply)) $mail->addReplyTo($reply);
    $mail->Subject = $formKind === 'Заказ обратного звонка' ? 'POLYD — заказ обратного звонка' : 'POLYD — запрос на подбор оборудования';
    $mail->Body = polydMailHtml($body); $mail->AltBody = $body; $mail->isHTML(true);
    foreach ($attachments as $attachment) $mail->addAttachment($attachment['path'], $attachment['name'], PHPMailer::ENCODING_BASE64, $attachment['mime']);
    $mail->send(); rewind($operation); ftruncate($operation, 0); fwrite($operation, 'sent'); fflush($operation); flock($operation, LOCK_UN); fclose($operation);
    respond(200, 'Почтовый сервер принял письмо. Ответим по указанному контакту');
} catch (Throwable $error) {
    rewind($operation); ftruncate($operation, 0); fwrite($operation, 'unknown'); fflush($operation); flock($operation, LOCK_UN); fclose($operation);
    respond(500, 'Не удалось подтвердить отправку. Данные и вложения остались в форме. Уточните получение по телефону или напишите на polyd-system@mail.ru');
}
