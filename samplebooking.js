const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Listing = require("./models/Listing");
require("dotenv").config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const LISTING_ID = "10006546";

async function runTests() {
  console.log("Starting tests against server:", BASE_URL);

  // Helper to make POST requests
  async function postBook(payload) {
    const res = await fetch(`${BASE_URL}/api/listings/${LISTING_ID}/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const status = res.status;
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status, data };
  }

  // 1. Missing fields
  console.log("\nTest 1: Missing fields");
  const t1 = await postBook({ startDate: "2030-01-01" });
  console.log("Status:", t1.status, "Response:", t1.data);
  if (t1.status !== 400) throw new Error("Expected 400");

  // 2. Invalid dates
  console.log("\nTest 2: Invalid dates");
  const t2 = await postBook({ startDate: "invalid-date", endDate: "2030-01-05" });
  console.log("Status:", t2.status, "Response:", t2.data);
  if (t2.status !== 400) throw new Error("Expected 400");

  // 3. Past start date
  console.log("\nTest 3: Past start date");
  const t3 = await postBook({ startDate: "2020-01-01", endDate: "2020-01-05" });
  console.log("Status:", t3.status, "Response:", t3.data);
  if (t3.status !== 400) throw new Error("Expected 400");

  // 4. End date before start date
  console.log("\nTest 4: End date before start date");
  const t4 = await postBook({ startDate: "2030-01-10", endDate: "2030-01-05" });
  console.log("Status:", t4.status, "Response:", t4.data);
  if (t4.status !== 400) throw new Error("Expected 400");

  // 5. Valid booking
  console.log("\nTest 5: Valid booking");
  const t5 = await postBook({ startDate: "2030-01-01", endDate: "2030-01-05" });
  console.log("Status:", t5.status, "Response:", t5.data);
  if (t5.status !== 201) throw new Error("Expected 201");

  // 6. Overlapping booking (entirely inside)
  console.log("\nTest 6: Overlapping booking (entirely inside)");
  const t6 = await postBook({ startDate: "2030-01-02", endDate: "2030-01-04" });
  console.log("Status:", t6.status, "Response:", t6.data);
  if (t6.status !== 400) throw new Error("Expected 400");

  // 7. Overlapping booking (left overlap)
  console.log("\nTest 7: Overlapping booking (left overlap)");
  const t7 = await postBook({ startDate: "2029-12-28", endDate: "2030-01-02" });
  console.log("Status:", t7.status, "Response:", t7.data);
  if (t7.status !== 400) throw new Error("Expected 400");

  // 8. Overlapping booking (right overlap)
  console.log("\nTest 8: Overlapping booking (right overlap)");
  const t8 = await postBook({ startDate: "2030-01-04", endDate: "2030-01-08" });
  console.log("Status:", t8.status, "Response:", t8.data);
  if (t8.status !== 400) throw new Error("Expected 400");

  // 9. Non-overlapping future booking
  console.log("\nTest 9: Non-overlapping future booking");
  const t9 = await postBook({ startDate: "2030-01-06", endDate: "2030-01-10" });
  console.log("Status:", t9.status, "Response:", t9.data);
  if (t9.status !== 201) throw new Error("Expected 201");

  console.log("\nAll integration API tests passed successfully!");
}

async function main() {
  // Let's connect to database to clean up the test bookings afterwards
  await connectDB();

  try {
    // Clear out any previous test bookings in 2030
    await Listing.updateOne(
      { _id: LISTING_ID },
      { $pull: { bookings: { startDate: { $gte: new Date("2030-01-01") } } } }
    );
    console.log("Cleaned up existing test bookings from DB.");

    await runTests();
  } catch (error) {
    console.error("Test execution failed:", error);
  } finally {
    // Clean up test bookings again so we don't leave mess in the DB
    await Listing.updateOne(
      { _id: LISTING_ID },
      { $pull: { bookings: { startDate: { $gte: new Date("2030-01-01") } } } }
    );
    console.log("Cleaned up test bookings from DB post-run.");
    mongoose.connection.close();
  }
}

main();
