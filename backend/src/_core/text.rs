//! Text helpers.

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/// Trims white space as JavaScript does (`String.prototype.trim`: incl. U+FEFF, without U+0085),
/// so names are stored and ids derived as by earlier versions.
pub fn trim(text: &str) -> &str {
    text.trim_matches(|c: char| (c.is_whitespace() && c != '\u{85}') || c == '\u{feff}')
}
