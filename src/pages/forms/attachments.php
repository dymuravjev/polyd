<?php
declare(strict_types=1);

// Only PHP-uploaded temporary files are attached; nothing is published or extracted.
function polydAttachments(array $files): array {
    $fail = static function (string $message): never { respond(400, $message, ['attachments' => $message]); };
    if (!$files) return [];
    if (array_keys($files) !== ['attachments'] || !is_array($files['attachments'])) $fail('Выберите файлы через поле технического задания');
    $upload = $files['attachments'];
    foreach (['name', 'tmp_name', 'size', 'error'] as $key) {
        if (!isset($upload[$key]) || !is_array($upload[$key]) || !array_is_list($upload[$key])) $fail('Не удалось прочитать вложения');
    }
    $count = count($upload['name']);
    foreach (['tmp_name', 'size', 'error'] as $key) if (count($upload[$key]) !== $count) $fail('Не удалось прочитать вложения');
    if ($count > 3) $fail('Можно прикрепить не более 3 файлов');
    if (!class_exists('finfo')) respond(503, 'Прикрепление файлов временно недоступно. Напишите на polyd-system@mail.ru');
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $result = []; $total = 0;
    $mimeMap = ['pdf' => 'application/pdf', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    for ($i = 0; $i < $count; $i++) {
        $error = $upload['error'][$i];
        if ($error === UPLOAD_ERR_NO_FILE && $count === 1) continue;
        if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) $fail('Каждый файл должен быть не больше 5 МБ');
        if ($error !== UPLOAD_ERR_OK || !is_string($upload['tmp_name'][$i]) || !is_uploaded_file($upload['tmp_name'][$i])) $fail('Файл не загрузился полностью. Выберите его ещё раз');
        $temporary = $upload['tmp_name'][$i];
        register_shutdown_function(static function () use ($temporary): void { if (is_file($temporary)) @unlink($temporary); });
        $size = filesize($temporary);
        if ($size === false || $size < 1) $fail('Пустой файл нельзя прикрепить');
        if ($size > 5 * 1024 * 1024) $fail('Каждый файл должен быть не больше 5 МБ');
        $total += $size;
        if ($total > 10 * 1024 * 1024) $fail('Общий размер файлов должен быть не больше 10 МБ');
        if (!is_string($upload['name'][$i])) $fail('Проверьте название файла');
        $name = basename(str_replace('\\', '/', $upload['name'][$i]));
        if (!preg_match('//u', $name) || strlen($name) > 240 || preg_match('/[\x00-\x1f\x7f]/u', $name)) $fail('Сократите название файла и уберите служебные символы');
        $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        if (!isset($mimeMap[$extension])) $fail('Допустимы только PDF, DOCX, XLSX, JPG и PNG');
        $actualMime = $finfo->file($temporary);
        if (in_array($extension, ['docx', 'xlsx'], true)) {
            if (!class_exists('ZipArchive')) respond(503, 'Прикрепление документов временно недоступно. Напишите на polyd-system@mail.ru');
            if (!in_array($actualMime, [$mimeMap[$extension], 'application/zip', 'application/x-zip'], true)) $fail('Содержимое файла не соответствует его формату');
            $zip = new ZipArchive();
            if ($zip->open($temporary) !== true) $fail('Документ повреждён. Сохраните его заново');
            $stat = $zip->statName('[Content_Types].xml');
            $part = $extension === 'docx' ? 'word/document.xml' : 'xl/workbook.xml';
            $expected = $extension === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml';
            $valid = $stat && $stat['size'] <= 65536 && $zip->locateName($part) !== false;
            $types = $valid ? $zip->getFromName('[Content_Types].xml', 65536) : false;
            $valid = $valid && is_string($types) && str_contains($types, $expected) && !preg_match('/macroEnabled|vbaProject/i', $types);
            for ($entry = 0; $valid && $entry < $zip->numFiles; $entry++) if (preg_match('~(?:^|/)vbaProject\.bin$~i', $zip->getNameIndex($entry))) $valid = false;
            $zip->close();
            if (!$valid) $fail('Выберите обычный DOCX или XLSX без макросов');
        } elseif ($actualMime !== $mimeMap[$extension]) $fail('Содержимое файла не соответствует его формату');
        $result[] = ['path' => $temporary, 'name' => $name, 'mime' => $mimeMap[$extension]];
    }
    return $result;
}
