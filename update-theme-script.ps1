# PowerShell script to update all HTML files with theme-loader.js reference
# Get all HTML files in the current directory and its subdirectories
$htmlFiles = Get-ChildItem -Path . -Filter "*.html" -Recurse

foreach ($file in $htmlFiles) {
    Write-Host "Processing $($file.FullName)"
    
    # Read the file content
    $content = Get-Content -Path $file.FullName -Raw
    
    # Check if the file already contains the theme-loader script
    if (-not $content.Contains("theme-loader.js")) {
        # Find the head tag
        if ($content -match "<head[^>]*>") {
            # Insert the theme-loader script right after the head tag
            $newContent = $content -replace "(<head[^>]*>)", "`$1`n    <!-- Theme loader script - must be first to prevent flickering -->`n    <script src=`"/Assets/theme-loader.js`"></script>"
            
            # Write the modified content back to the file
            Set-Content -Path $file.FullName -Value $newContent -NoNewline
            
            Write-Host "  Added theme-loader script to $($file.Name)" -ForegroundColor Green
        } else {
            Write-Host "  Could not find <head> tag in $($file.Name)" -ForegroundColor Red
        }
    } else {
        Write-Host "  theme-loader script already present in $($file.Name)" -ForegroundColor Yellow
    }
}

Write-Host "Completed processing all HTML files." -ForegroundColor Cyan 