//! Generates the Rust types of the API from /models/api.yaml (`components.schemas`),
//! as `@hey-api/openapi-ts` does for the frontend.
//!
//! Usage (see `just build-models-backend`): `codegen <path/to/schema.yaml> <path/to/output.rs>`
//! Built with the feature `codegen` only, so without the generated types (see `[features]` in /backend/Cargo.toml).

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use std::env;
use std::fs;
use std::path::Path;

use schemars::schema::Schema;
use serde_json::Value;
use syn::File;
use typify::TypeSpace;
use typify::TypeSpaceSettings;

// ----------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let [input, output] = args.as_slice() else {
        panic!("usage: codegen <path/to/schema.yaml> <path/to/output.rs>");
    };

    let text = fs::read_to_string(input).unwrap_or_else(|err| panic!("{input}: {err}"));
    let spec: Value = serde_yaml_ng::from_str(&text).unwrap_or_else(|err| panic!("{input}: {err}"));
    let schemas = spec["components"]["schemas"]
        .as_object()
        .unwrap_or_else(|| panic!("{input}: no components.schemas"));

    // `$ref`s are resolved by their last segment, so `#/components/schemas/…` works as is
    let types = schemas.iter().map(|(name, schema)| {
        let schema: Schema = serde_json::from_value(schema.clone()).unwrap_or_else(|err| panic!("{name}: {err}"));
        (name.clone(), schema)
    });

    // typify's defaults: serde, Clone and Debug, plus comparison etc. wherever a type supports it
    let mut space = TypeSpace::new(&TypeSpaceSettings::new());
    space.add_ref_types(types).expect("schemas supported by typify");

    let tokens = space.to_stream().expect("types generated");
    let file: File = syn::parse2(tokens).expect("valid Rust");

    // one item at a time, joined by a blank line (prettyplease alone prints items without one)
    let mut one = file.clone();
    let items: Vec<String> = file
        .items
        .into_iter()
        .map(|item| {
            one.items = vec![item];
            tidy_docs(&prettyplease::unparse(&one))
        })
        .collect();

    let code = format!(
        "// generated from {input} by /backend/src/bin/codegen (`just build-models-backend`): do not edit\n\n{}",
        items.join("\n"),
    );

    if let Some(parent) = Path::new(output).parent() {
        fs::create_dir_all(parent).unwrap_or_else(|err| panic!("{}: {err}", parent.display()));
    }

    fs::write(output, code).unwrap_or_else(|err| panic!("{output}: {err}"));
    println!("wrote {output} ({} types)", schemas.len());
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/// Doc comments as `/// text`, one per line:
/// prettyplease prints `///text`, and `/** … */` (continued without indentation) for several lines.
fn tidy_docs(code: &str) -> String {
    let mut result = String::new();
    // indentation of an open `/** … */`
    let mut block: Option<String> = None;

    for line in code.lines() {
        let text = line.trim_start();
        let indent = &line[..line.len() - text.len()];

        if let Some(pad) = &block {
            let end = line.ends_with("*/");
            push_doc(&mut result, pad, line.strip_suffix("*/").unwrap_or(line));

            if end {
                block = None;
            }
        } else if let Some(rest) = text.strip_prefix("/**") {
            match rest.strip_suffix("*/") {
                Some(rest) => push_doc(&mut result, indent, rest),

                None => {
                    push_doc(&mut result, indent, rest);
                    block = Some(indent.to_string());
                }
            }
        } else if let Some(rest) = text.strip_prefix("///") {
            push_doc(&mut result, indent, rest);
        } else {
            result.push_str(line);
            result.push('\n');
        }
    }

    result
}

fn push_doc(result: &mut String, indent: &str, text: &str) {
    match text.trim() {
        "" => result.push_str(&format!("{indent}///\n")),
        text => result.push_str(&format!("{indent}/// {text}\n")),
    }
}
