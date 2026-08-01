<?php
$root = str_replace('\\', '/', $_SERVER['DOCUMENT_ROOT']);
chdir($root);

$uri = $_SERVER['REQUEST_URI'] ?? '/';
$pathOnly = parse_url($uri, PHP_URL_PATH);
$cleanPath = '/' . ltrim($pathOnly, '/');
$targetPath = rtrim($root, '/') . $cleanPath;
$ext = pathinfo($cleanPath, PATHINFO_EXTENSION);

// 1. Directory Trailing Slash Redirect Standard (cPanel / Nginx / Apache standard)
// If a directory is requested without a trailing slash (e.g. /wp-admin or /administrator),
// send an immediate HTTP 301 redirect to add the trailing slash (e.g. /wp-admin/).
// This ensures browsers resolve relative HTML links (like href="edit.php") to /wp-admin/edit.php.
if (is_dir($targetPath)) {
    if (substr($pathOnly, -1) !== '/') {
        $queryString = isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== '' ? '?' . $_SERVER['QUERY_STRING'] : '';
        header('Location: ' . $pathOnly . '/' . $queryString, true, 301);
        exit;
    }

    $dirIndex = rtrim($targetPath, '/') . '/index.php';
    if (file_exists($dirIndex)) {
        $scriptRel = rtrim($pathOnly, '/') . '/index.php';
        $_SERVER['SCRIPT_NAME'] = $scriptRel;
        $_SERVER['PHP_SELF'] = $scriptRel;
        $_SERVER['SCRIPT_FILENAME'] = $dirIndex;
        include $dirIndex;
        return true;
    }
}

// 2. Physical PHP Files Direct Execution (e.g., /wp-admin/edit.php, /wp-admin/plugins.php)
if (file_exists($targetPath) && !is_dir($targetPath)) {
    $_SERVER['SCRIPT_NAME'] = $pathOnly;
    $_SERVER['PHP_SELF'] = $pathOnly;
    $_SERVER['SCRIPT_FILENAME'] = $targetPath;
    include $targetPath;
    return true;
}

// 3. Static Assets Direct Serving (css, js, images, fonts, media)
if ($ext && strtolower($ext) !== 'php') {
    if (file_exists($targetPath)) {
        return false;
    }
}

// 4. Return explicit 404 for non-existent .php requests instead of falling back to homepage
if (strtolower($ext) === 'php') {
    http_response_code(404);
    echo "<h1>404 Not Found</h1><p>The requested PHP script <code>" . htmlspecialchars($pathOnly) . "</code> was not found on this server.</p>";
    return true;
}

// 5. Front Controller Fallback ONLY for non-.php permalink paths (e.g. /sample-post/)
$rootIndex = rtrim($root, '/') . '/index.php';
if (file_exists($rootIndex)) {
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['PHP_SELF'] = '/index.php';
    $_SERVER['SCRIPT_FILENAME'] = $rootIndex;
    include $rootIndex;
    return true;
}

return false;
