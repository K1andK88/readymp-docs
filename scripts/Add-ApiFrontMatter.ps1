<#
.SYNOPSIS
    Gives every generated API reference page a title and description in its front matter.

.DESCRIPTION
    docfx writes the page title only as its H1 and no description at all, so anything reading front matter (search
    snippets, link previews, the llms.txt files) falls back to the first paragraph, which on these pages is the
    namespace and assembly. The title is the H1, unescaped. The description is the summary under the Assembly line;
    a namespace page, which has none, says which namespace it lists. Running it again replaces the front matter.
#>
param(
    [Parameter(Mandatory)] [string] $Path
)

$utf8 = New-Object System.Text.UTF8Encoding $false

# Markdown or HTML inline text as plain text on one line
function ConvertTo-PlainText([string] $text) {
    $text = $text -replace '<[^>]+>', ''
    $text = $text -replace '!?\[([^\]]*)\]\([^)]*\)', '$1'
    $text = $text -replace '\\([\\`*_{}\[\]()#+\-.!<>])', '$1'
    $text = $text -replace '`', ''
    $text = $text -replace '\*\*', ''
    $text = [System.Net.WebUtility]::HtmlDecode($text)
    return ($text -replace '\s+', ' ').Trim()
}

function ConvertTo-YamlString([string] $text) {
    return "'" + ($text -replace "'", "''") + "'"
}

Get-ChildItem -Path $Path -Filter *.md -Recurse -File | ForEach-Object {
    $raw = [System.IO.File]::ReadAllText($_.FullName)
    $newline = if ($raw.Contains("`r`n")) { "`r`n" } else { "`n" }
    $body = $raw.TrimStart([char]0xFEFF)

    # drop front matter from an earlier run
    if ($body.StartsWith("---")) {
        $end = $body.IndexOf("$newline---$newline", 3)
        if ($end -ge 0) {
            $body = $body.Substring($end + $newline.Length * 2 + 3)
        }
    }

    $lines = $body -split '\r?\n'
    $heading = $lines | Where-Object { $_.StartsWith('# ') } | Select-Object -First 1
    if (-not $heading) {
        Write-Warning "No title in $($_.FullName), leaving it as it is"
        return
    }

    # not ConvertTo-PlainText, which would take a generic type's <T> for an HTML tag
    $title = ($heading.Substring(2) -replace '\\([\\`*_{}\[\]()#+\-.!<>])', '$1').Trim()

    $assembly = [Array]::FindIndex($lines, [Predicate[string]] { param($line) $line.StartsWith('Assembly:') })
    if ($assembly -lt 0) {
        $description = "The types in the $title namespace."
    }
    else {
        $paragraph = @()
        foreach ($line in $lines[($assembly + 1)..($lines.Count - 1)]) {
            if ($line.Trim() -eq '') {
                if ($paragraph.Count -gt 0) { break }
                continue
            }
            if ($line -match '^(```|#)') { break }
            $paragraph += $line
        }
        $description = ConvertTo-PlainText ($paragraph -join ' ')
    }

    $frontMatter = @('---', "title: $(ConvertTo-YamlString $title)")
    if ($description) {
        $frontMatter += "description: $(ConvertTo-YamlString $description)"
    }
    $frontMatter += '---'

    [System.IO.File]::WriteAllText($_.FullName, ($frontMatter -join $newline) + $newline + $body, $utf8)
}
