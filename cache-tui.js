import { existsSync, readdirSync, rmSync } from "node:fs";
import { createInterface } from "node:readline";
import { homedir, userInfo, platform } from "node:os";
import { join } from "node:path";
import { stdin, stdout } from "node:process";

const io = createInterface(stdin, stdout);
const FILENAME_ERROR_LOG = false;

const CACHE_REL_PATH = join(
  "AppData",
  "Roaming",
  "OldTanksOnline.Client.Standalone",
  "Local Store",
  "cache",
);

const CACHE_ABS_PATH =
  {
    win32: join(homedir(), CACHE_REL_PATH),
    linux: join(
      homedir(),
      ".wine",
      "drive_c",
      "users",
      userInfo().username,
      CACHE_REL_PATH,
    ),
  }[platform()] ?? "";

if (!CACHE_ABS_PATH) throw new Error("* Ts platform not supported vro 😭🙏");

function InvalidBase64Logger(filename) {
  console.log("\x1b[35m", "NOT VALID BASE64:", filename, "\x1b[0m");
}

function FoundLogger(file) {
  console.log(
    "\x1b[32m",
    "FOUND:",
    file.decoded,
    "->",
    file.encoded,
    "\x1b[0m",
  );
}

function WarningLogger(file) {
  console.log(
    "\x1b[33m",
    "WARNING:",
    file.decoded,
    "->",
    file.encoded,
    "\x1b[0m",
  );
}

function DeleteLogger(file) {
  console.log(
    "\x1b[31m",
    "DELETED:",
    file.decoded,
    "->",
    file.encoded,
    "\x1b[0m",
  );
}

function GetFileList() {
  return readdirSync(CACHE_ABS_PATH).map((filename) => {
    try {
      return {
        encoded: filename,
        decoded: atob(filename),
      };
    } catch {
      if (FILENAME_ERROR_LOG) {
        InvalidBase64Logger(filename);
      }

      return {
        encoded: filename,
        decoded: "",
      };
    }
  });
}

async function AsyncPrompt(prompt) {
  io.setPrompt(prompt);
  io.prompt();

  return await new Promise((resolve) => {
    const listener = (input) => {
      io.removeListener("line", listener);
      resolve(input);
    };

    io.addListener("line", listener);
  });
}

function Info() {
  console.log();
  console.log("Command List:");
  console.log("search <resource name>");
  console.log("delete <resource name>");
  console.log("help");
  console.log("clear");
  console.log("exit");
  console.log();
}

async function Main() {
  if (existsSync(CACHE_ABS_PATH)) {
    console.log(`* Type "help" to view commands.`);

    while (true) {
      const input = await AsyncPrompt("* Enter a command (and query): ");
      const [command, query] = input.split(" ");

      if (!command) {
        console.log("* Command Missing.");
        continue;
      }

      switch (command) {
        case "exit": {
          process.exit(0);
        }

        case "clear": {
          console.clear();
          io.prompt();
          continue;
        }

        case "help": {
          Info();
          continue;
        }

        case "search": {
          if (!query) continue;

          const files = GetFileList();
          const files_matched = [];

          for (const file of files) {
            if (file.decoded.match(query)) {
              FoundLogger(file);
              files_matched.push(file);
            }
          }

          if (files_matched.length === 0) {
            console.log(`* No results for "${query}".`);
            continue;
          }

          console.log();

          continue;
        }

        case "delete": {
          if (!query) continue;

          const files = GetFileList();
          const files_matched = [];

          for (const file of files) {
            if (file.decoded.match(query)) {
              WarningLogger(file);
              files_matched.push(file);
            }
          }

          if (files_matched.length === 0) {
            console.log(`* No results for "${query}".`);
            continue;
          }

          console.log();

          loop: for (
            let confirm = "";
            ;
            confirm = await AsyncPrompt("* Really Delete? [y/n]: ")
          ) {
            switch (confirm) {
              case "y": {
                for (const file of files) {
                  if (file.decoded.match(query)) {
                    rmSync(join(CACHE_ABS_PATH, file.encoded));
                    DeleteLogger(file);
                  }
                }
                break loop;
              }
              case "n": {
                console.log("* Aborted.");
                break loop;
              }
            }
          }

          console.log();

          continue;
        }
        default: {
          console.log(`* "${command}" is not a valid command.`);
        }
      }
    }
  } else {
    throw new Error("* Sorry cuh, we get 0 game 💔🥀");
  }
}

Main();
