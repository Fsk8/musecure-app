import { migrate } from "../lib/database";
async function main() {
    if (process.env.IS_SEEDING !== "true")
        return;
    await migrate();
    console.log("DB ready");
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
