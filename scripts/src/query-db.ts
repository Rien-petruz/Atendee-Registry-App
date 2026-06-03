import { db, smsCampaignsTable, desc } from "@workspace/db";

async function main() {
  console.log("Fetching sms campaigns...");
  const campaigns = await db.select().from(smsCampaignsTable).orderBy(desc(smsCampaignsTable.sentAt)).limit(10);
  console.log("Campaigns:");
  console.log(JSON.stringify(campaigns, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
