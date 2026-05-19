use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct ExportAnkiPackageCard {
    pub id: String,
    pub front: String,
    pub back: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Eq, PartialEq, Deserialize)]
pub struct ExportAnkiPackageRequest {
    pub file_path: String,
    pub deck_name: String,
    pub cards: Vec<ExportAnkiPackageCard>,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize)]
pub struct ExportAnkiPackageResponse {
    pub file_path: String,
    pub card_count: usize,
}

pub fn export_anki_package_to_path(
    request: ExportAnkiPackageRequest,
) -> Result<ExportAnkiPackageResponse, String> {
    let file_path = request.file_path.trim();
    let deck_name = request.deck_name.trim();

    if file_path.is_empty() {
        return Err("Informe o caminho para exportar o pacote Anki.".to_owned());
    }

    if deck_name.is_empty() {
        return Err("Informe o nome do deck Anki.".to_owned());
    }

    if request.cards.is_empty() {
        return Err("Nao ha cards para exportar.".to_owned());
    }

    for card in &request.cards {
        if card.front.trim().is_empty() || card.back.trim().is_empty() {
            return Err("Todos os cards precisam ter frente e verso.".to_owned());
        }
    }

    let collection_path = temporary_collection_path();
    create_anki_collection(&collection_path, deck_name, &request.cards)
        .map_err(|_| "Nao foi possivel gerar o pacote Anki.".to_owned())?;

    let collection_bytes = fs::read(&collection_path)
        .map_err(|_| "Nao foi possivel gerar o pacote Anki.".to_owned())?;
    let _ = fs::remove_file(&collection_path);

    let package_bytes = write_stored_zip(&[
        ZipEntry {
            name: "collection.anki2",
            bytes: &collection_bytes,
        },
        ZipEntry {
            name: "media",
            bytes: b"{}",
        },
    ])?;

    fs::write(Path::new(file_path), package_bytes)
        .map_err(|_| "Nao foi possivel exportar o pacote Anki.".to_owned())?;

    Ok(ExportAnkiPackageResponse {
        file_path: file_path.to_owned(),
        card_count: request.cards.len(),
    })
}

#[cfg(feature = "tauri-app")]
#[tauri::command]
pub fn export_anki_package(
    file_path: String,
    deck_name: String,
    cards: Vec<ExportAnkiPackageCard>,
) -> Result<ExportAnkiPackageResponse, String> {
    export_anki_package_to_path(ExportAnkiPackageRequest {
        file_path,
        deck_name,
        cards,
    })
}

fn create_anki_collection(
    path: &Path,
    deck_name: &str,
    cards: &[ExportAnkiPackageCard],
) -> rusqlite::Result<()> {
    let mut connection = Connection::open(path)?;
    create_anki_schema(&connection)?;
    insert_collection_metadata(&connection, deck_name)?;

    let transaction = connection.transaction()?;
    let base_id = current_millis();
    let now_seconds = current_seconds();
    let deck_id = 1_i64;
    let model_id = 1_607_392_319_i64;

    for (index, card) in cards.iter().enumerate() {
        let note_id = base_id + ((index as i64) * 2);
        let card_id = note_id + 1;
        let front = to_anki_field_html(&card.front);
        let back = to_anki_field_html(&card.back);
        let fields = format!("{front}\x1f{back}");
        let tags = to_anki_tags(&card.tags);

        transaction.execute(
            "insert into notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
             values (?1, ?2, ?3, ?4, -1, ?5, ?6, ?7, ?8, 0, '')",
            params![
                note_id,
                to_anki_guid(&card.id),
                model_id,
                now_seconds,
                tags,
                fields,
                to_plain_sort_field(&card.front),
                checksum(&card.front),
            ],
        )?;

        transaction.execute(
            "insert into cards
             (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
             values (?1, ?2, ?3, 0, ?4, -1, 0, 0, ?5, 0, 2500, 0, 0, 0, 0, 0, 0, '')",
            params![card_id, note_id, deck_id, now_seconds, (index as i64) + 1],
        )?;
    }

    transaction.commit()
}

fn create_anki_schema(connection: &Connection) -> rusqlite::Result<()> {
    connection.execute_batch(
        "
        create table col (
            id integer primary key,
            crt integer not null,
            mod integer not null,
            scm integer not null,
            ver integer not null,
            dty integer not null,
            usn integer not null,
            ls integer not null,
            conf text not null,
            models text not null,
            decks text not null,
            dconf text not null,
            tags text not null
        );

        create table notes (
            id integer primary key,
            guid text not null,
            mid integer not null,
            mod integer not null,
            usn integer not null,
            tags text not null,
            flds text not null,
            sfld text not null,
            csum integer not null,
            flags integer not null,
            data text not null
        );

        create table cards (
            id integer primary key,
            nid integer not null,
            did integer not null,
            ord integer not null,
            mod integer not null,
            usn integer not null,
            type integer not null,
            queue integer not null,
            due integer not null,
            ivl integer not null,
            factor integer not null,
            reps integer not null,
            lapses integer not null,
            left integer not null,
            odue integer not null,
            odid integer not null,
            flags integer not null,
            data text not null
        );

        create table revlog (
            id integer primary key,
            cid integer not null,
            usn integer not null,
            ease integer not null,
            ivl integer not null,
            lastIvl integer not null,
            factor integer not null,
            time integer not null,
            type integer not null
        );

        create table graves (
            usn integer not null,
            oid integer not null,
            type integer not null
        );

        create index ix_notes_usn on notes (usn);
        create index ix_cards_usn on cards (usn);
        create index ix_cards_nid on cards (nid);
        create index ix_cards_sched on cards (did, queue, due);
        ",
    )
}

fn insert_collection_metadata(connection: &Connection, deck_name: &str) -> rusqlite::Result<()> {
    let now_seconds = current_seconds();
    let model_id = 1_607_392_319_i64;
    let deck_id = 1_i64;
    let escaped_deck_name = deck_name.trim();

    let conf = json!({
        "nextPos": 1,
        "estTimes": true,
        "activeDecks": [deck_id],
        "curDeck": deck_id,
        "newSpread": 0,
        "collapseTime": 1200,
        "timeLim": 0
    });
    let models = json!({
        model_id.to_string(): {
            "id": model_id,
            "name": "Estudo IA Local Basic",
            "type": 0,
            "mod": now_seconds,
            "usn": -1,
            "sortf": 0,
            "did": deck_id,
            "tmpls": [{
                "name": "Card 1",
                "ord": 0,
                "qfmt": "{{Front}}",
                "afmt": "{{FrontSide}}<hr id=answer>{{Back}}",
                "bqfmt": "",
                "bafmt": "",
                "did": null
            }],
            "flds": [
                {"name": "Front", "ord": 0, "sticky": false, "rtl": false, "font": "Arial", "size": 20},
                {"name": "Back", "ord": 1, "sticky": false, "rtl": false, "font": "Arial", "size": 20}
            ],
            "css": ".card { font-family: arial; font-size: 20px; text-align: left; color: black; background-color: white; }",
            "latexPre": "",
            "latexPost": "",
            "req": [[0, "all", [0]]]
        }
    });
    let decks = json!({
        deck_id.to_string(): {
            "id": deck_id,
            "name": escaped_deck_name,
            "desc": "",
            "dyn": 0,
            "collapsed": false,
            "browserCollapsed": false,
            "conf": 1,
            "extendNew": 10,
            "extendRev": 50,
            "mod": now_seconds,
            "usn": -1,
            "newToday": [0, 0],
            "revToday": [0, 0],
            "lrnToday": [0, 0],
            "timeToday": [0, 0]
        }
    });
    let dconf = json!({
        "1": {
            "id": 1,
            "name": "Default",
            "mod": now_seconds,
            "usn": -1,
            "maxTaken": 60,
            "autoplay": true,
            "timer": 0,
            "replayq": true,
            "new": {
                "bury": true,
                "delays": [1, 10],
                "initialFactor": 2500,
                "ints": [1, 4, 7],
                "order": 1,
                "perDay": 20,
                "separate": true
            },
            "rev": {
                "bury": true,
                "ease4": 1.3,
                "fuzz": 0.05,
                "ivlFct": 1,
                "maxIvl": 36500,
                "perDay": 200
            },
            "lapse": {
                "delays": [10],
                "leechAction": 0,
                "leechFails": 8,
                "minInt": 1,
                "mult": 0
            }
        }
    });

    connection.execute(
        "insert into col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
         values (1, ?1, ?2, ?2, 11, 0, -1, 0, ?3, ?4, ?5, ?6, '{}')",
        params![
            now_seconds / 86_400,
            now_seconds,
            conf.to_string(),
            models.to_string(),
            decks.to_string(),
            dconf.to_string()
        ],
    )?;

    Ok(())
}

fn to_anki_field_html(value: &str) -> String {
    escape_html(value.trim()).replace('\n', "<br>")
}

fn to_plain_sort_field(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn to_anki_guid(value: &str) -> String {
    let guid = value
        .chars()
        .filter(|character| {
            character.is_ascii_alphanumeric() || *character == '-' || *character == '_'
        })
        .collect::<String>();

    if guid.is_empty() {
        Uuid::new_v4().to_string()
    } else {
        guid
    }
}

fn to_anki_tags(tags: &[String]) -> String {
    let normalized_tags = tags
        .iter()
        .map(|tag| {
            tag.trim()
                .chars()
                .map(|character| {
                    if character.is_ascii_alphanumeric() || character == '_' || character == '-' {
                        character
                    } else {
                        '_'
                    }
                })
                .collect::<String>()
                .trim_matches('_')
                .to_owned()
        })
        .filter(|tag| !tag.is_empty())
        .collect::<Vec<_>>();

    if normalized_tags.is_empty() {
        String::new()
    } else {
        format!(" {} ", normalized_tags.join(" "))
    }
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn checksum(value: &str) -> i64 {
    value.bytes().fold(0_u32, |accumulator, byte| {
        accumulator.wrapping_mul(33).wrapping_add(byte as u32)
    }) as i64
}

fn current_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn current_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn temporary_collection_path() -> PathBuf {
    std::env::temp_dir().join(format!("estudo-ia-local-{}.anki2", Uuid::new_v4()))
}

struct ZipEntry<'a> {
    name: &'a str,
    bytes: &'a [u8],
}

struct CentralDirectoryEntry {
    name: String,
    crc32: u32,
    size: u32,
    offset: u32,
}

fn write_stored_zip(entries: &[ZipEntry<'_>]) -> Result<Vec<u8>, String> {
    let mut output = Vec::new();
    let mut central_entries = Vec::new();

    for entry in entries {
        let name = entry.name.as_bytes();
        let size = u32::try_from(entry.bytes.len())
            .map_err(|_| "Arquivo Anki muito grande para exportar.".to_owned())?;
        let offset = u32::try_from(output.len())
            .map_err(|_| "Arquivo Anki muito grande para exportar.".to_owned())?;
        let crc32 = crc32(entry.bytes);

        write_u32(&mut output, 0x0403_4b50);
        write_u16(&mut output, 20);
        write_u16(&mut output, 0);
        write_u16(&mut output, 0);
        write_u16(&mut output, 0);
        write_u16(&mut output, 0);
        write_u32(&mut output, crc32);
        write_u32(&mut output, size);
        write_u32(&mut output, size);
        write_u16(&mut output, name.len() as u16);
        write_u16(&mut output, 0);
        output
            .write_all(name)
            .map_err(|_| "Nao foi possivel gerar o pacote Anki.".to_owned())?;
        output
            .write_all(entry.bytes)
            .map_err(|_| "Nao foi possivel gerar o pacote Anki.".to_owned())?;

        central_entries.push(CentralDirectoryEntry {
            name: entry.name.to_owned(),
            crc32,
            size,
            offset,
        });
    }

    let central_directory_offset = output.len() as u32;

    for entry in &central_entries {
        let name = entry.name.as_bytes();

        write_u32(&mut output, 0x0201_4b50);
        write_u16(&mut output, 20);
        write_u16(&mut output, 20);
        write_u16(&mut output, 0);
        write_u16(&mut output, 0);
        write_u16(&mut output, 0);
        write_u16(&mut output, 0);
        write_u32(&mut output, entry.crc32);
        write_u32(&mut output, entry.size);
        write_u32(&mut output, entry.size);
        write_u16(&mut output, name.len() as u16);
        write_u16(&mut output, 0);
        write_u16(&mut output, 0);
        write_u16(&mut output, 0);
        write_u16(&mut output, 0);
        write_u32(&mut output, 0);
        write_u32(&mut output, entry.offset);
        output
            .write_all(name)
            .map_err(|_| "Nao foi possivel gerar o pacote Anki.".to_owned())?;
    }

    let central_directory_size = (output.len() as u32) - central_directory_offset;

    write_u32(&mut output, 0x0605_4b50);
    write_u16(&mut output, 0);
    write_u16(&mut output, 0);
    write_u16(&mut output, central_entries.len() as u16);
    write_u16(&mut output, central_entries.len() as u16);
    write_u32(&mut output, central_directory_size);
    write_u32(&mut output, central_directory_offset);
    write_u16(&mut output, 0);

    Ok(output)
}

fn write_u16(output: &mut Vec<u8>, value: u16) {
    output.extend_from_slice(&value.to_le_bytes());
}

fn write_u32(output: &mut Vec<u8>, value: u32) {
    output.extend_from_slice(&value.to_le_bytes());
}

fn crc32(bytes: &[u8]) -> u32 {
    let mut crc = 0xffff_ffff_u32;

    for byte in bytes {
        crc ^= *byte as u32;

        for _ in 0..8 {
            let mask = (crc & 1).wrapping_neg();
            crc = (crc >> 1) ^ (0xedb8_8320 & mask);
        }
    }

    !crc
}

#[cfg(test)]
mod tests {
    use std::fs;

    use rusqlite::Connection;
    use tempfile::TempDir;

    use super::{export_anki_package_to_path, ExportAnkiPackageCard, ExportAnkiPackageRequest};

    #[test]
    fn exports_apkg_with_collection_and_media_entries() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("deck.apkg");

        let response = export_anki_package_to_path(ExportAnkiPackageRequest {
            file_path: file_path.to_string_lossy().to_string(),
            deck_name: "Estudo IA Local".to_owned(),
            cards: vec![
                ExportAnkiPackageCard {
                    id: "card-1".to_owned(),
                    front: "O que e Rust?".to_owned(),
                    back: "Uma linguagem de sistemas.".to_owned(),
                    tags: vec!["programacao".to_owned(), "rust basico".to_owned()],
                },
                ExportAnkiPackageCard {
                    id: "card-2".to_owned(),
                    front: "O que e ownership?".to_owned(),
                    back: "Regra de posse de memoria.".to_owned(),
                    tags: vec!["memoria".to_owned()],
                },
            ],
        })
        .unwrap();

        assert_eq!(response.file_path, file_path.to_string_lossy());
        assert_eq!(response.card_count, 2);

        let package_bytes = fs::read(&file_path).unwrap();
        assert!(package_bytes.starts_with(b"PK\x03\x04"));
        assert_eq!(extract_stored_zip_entry(&package_bytes, "media"), b"{}");

        let collection_bytes = extract_stored_zip_entry(&package_bytes, "collection.anki2");
        let collection_path = temp_dir.path().join("collection.anki2");
        fs::write(&collection_path, collection_bytes).unwrap();

        let connection = Connection::open(collection_path).unwrap();
        let note_count: i64 = connection
            .query_row("select count(*) from notes", [], |row| row.get(0))
            .unwrap();
        let card_count: i64 = connection
            .query_row("select count(*) from cards", [], |row| row.get(0))
            .unwrap();
        let deck_name: String = connection
            .query_row("select decks from col", [], |row| row.get(0))
            .unwrap();
        let fields: String = connection
            .query_row("select flds from notes order by id limit 1", [], |row| {
                row.get(0)
            })
            .unwrap();
        let tags: String = connection
            .query_row("select tags from notes order by id limit 1", [], |row| {
                row.get(0)
            })
            .unwrap();

        assert_eq!(note_count, 2);
        assert_eq!(card_count, 2);
        assert!(deck_name.contains("Estudo IA Local"));
        assert!(fields.contains("O que e Rust?"));
        assert!(fields.contains("Uma linguagem de sistemas."));
        assert!(tags.contains("programacao"));
        assert!(tags.contains("rust_basico"));
    }

    #[test]
    fn rejects_empty_deck_exports() {
        let error = export_anki_package_to_path(ExportAnkiPackageRequest {
            file_path: "/tmp/deck.apkg".to_owned(),
            deck_name: "Estudo".to_owned(),
            cards: vec![],
        })
        .unwrap_err();

        assert_eq!(error, "Nao ha cards para exportar.");
    }

    fn extract_stored_zip_entry(bytes: &[u8], entry_name: &str) -> Vec<u8> {
        let mut cursor = 0_usize;

        while cursor + 30 <= bytes.len() {
            let signature = u32::from_le_bytes(bytes[cursor..cursor + 4].try_into().unwrap());

            if signature == 0x0201_4b50 || signature == 0x0605_4b50 {
                break;
            }

            assert_eq!(signature, 0x0403_4b50);

            let size =
                u32::from_le_bytes(bytes[cursor + 18..cursor + 22].try_into().unwrap()) as usize;
            let name_length =
                u16::from_le_bytes(bytes[cursor + 26..cursor + 28].try_into().unwrap()) as usize;
            let extra_length =
                u16::from_le_bytes(bytes[cursor + 28..cursor + 30].try_into().unwrap()) as usize;
            let name_start = cursor + 30;
            let name_end = name_start + name_length;
            let data_start = name_end + extra_length;
            let data_end = data_start + size;
            let name = std::str::from_utf8(&bytes[name_start..name_end]).unwrap();

            if name == entry_name {
                return bytes[data_start..data_end].to_vec();
            }

            cursor = data_end;
        }

        panic!("entry not found: {entry_name}");
    }
}
