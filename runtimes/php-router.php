<?php
$root = $_SERVER['DOCUMENT_ROOT'];
chdir($root);

$uri = $_SERVER['REQUEST_URI'] ?? '/';
$pathOnly = parse_url($uri, PHP_URL_PATH);
$path = '/' . ltrim($pathOnly, '/');

// 1. If requesting a static asset (css, js, images, fonts), let PHP CLI server serve directly
$ext = pathinfo($path, PATHINFO_EXTENSION);
if ($ext && strtolower($ext) !== 'php') {
    if (file_exists($root . $path)) {
        return false;
    }
}

// 2. If requesting a physical PHP file (e.g., /wp-admin/themes.php, /wp-admin/plugins.php, /wp-admin/edit.php)
if (file_exists($root . $path) && !is_dir($root . $path)) {
    $_SERVER['SCRIPT_NAME'] = $pathOnly;
    $_SERVER['PHP_SELF'] = $pathOnly;
    $_SERVER['SCRIPT_FILENAME'] = $root . $path;
    include $root . $path;
    return true;
}

// 3. If requesting a directory (e.g., /wp-admin), enforce trailing slash redirect standard
if (is_dir($root . $path)) {
    if (substr($pathOnly, -1) !== '/') {
        $queryString = isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== '' ? '?' . $_SERVER['QUERY_STRING'] : '';
        header('Location: ' . $pathOnly . '/' . $queryString, true, 301);
        exit;
    }

    $dirIndex = rtrim($pathOnly, '/') . '/index.php';
    if (file_exists($root . $dirIndex)) {
        $_SERVER['SCRIPT_NAME'] = $dirIndex;
        $_SERVER['PHP_SELF'] = $dirIndex;
        $_SERVER['SCRIPT_FILENAME'] = $root . $dirIndex;
        include $root . $dirIndex;
        return true;
    }
}

// 4. Front controller fallback to root /index.php for permalinks
if (file_exists($root . '/index.php')) {
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['PHP_SELF'] = '/index.php';
    $_SERVER['SCRIPT_FILENAME'] = $root . '/index.php';
    include $root . '/index.php';
    return true;
}

return false;
