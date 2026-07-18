Tracking Workflow (flow)
1) Configure workflow template(s)
Create a template in progress_workflow_templates
optionally set parent_id (child template inherits steps if it has none)
set batching fields if needed:
is_batchable=true
batch_parts, batch_part_amount
Define steps in progress_workflow_template_steps
or rely on parent’s steps if the child has none.
2) Donation created → tracker created
Donation row goes into donations
A tracker row goes into progress_trackers:
template_id = selected template
donation_id = donation
batch_parts_count = requested parts (e.g., cow shares or number of goats)
3) Batching allocates parts into batch numbers
The batching utility creates/uses a row in progress_workflow_batches per template:
Batch #1, #2, #3… auto increments
It writes donation_batch_allocations rows that say:
Donation X belongs to Batch #12, parts 6–7
Donation X belongs to Batch #13, part 1
This is how you later answer:
“Which batch numbers does this donation belong to?”
“How many parts does it have?”
4) Evidence (shared at batch level)
For batchable templates, evidence is stored in progress_batch_step_evidence keyed by:
batch_id + step_key
When a tracker step is fetched, the API merges:
tracker-step evidence (progress_step_evidence)
plus batch evidence for all batches the donation belongs to
UI displays labels like:
“Batch #12 evidence”, “Batch #13 evidence”
5) Status (propagated across batch trackers)
When a step status changes on one tracker (for a batchable template):
the same step_key status propagates to all trackers whose donations are in the same batch(es)
each affected tracker’s overall_status is recomputed
Special case: “3 goats in one donation”
Make goat template batchable with:

batch_parts=1, batch_part_amount=goat_price Then batch_parts_count=3 creates 3 separate batches, enabling separate evidence/status per goat batch.
also give me a copy pasteable text with a example also 

Copy‑pasteable explanation (with example)
Core idea:
A Donation selects a Workflow Template. A Progress Tracker is created for that donation and template. If the template is batchable, the donation gets assigned into one or more Batches, and each batch can have shared step evidence + shared step status across all donations/trackers in that same batch.

Tables and what they mean
donations

The payment/finance record (amount, donor, status, method, etc.)
progress_workflow_templates

The workflow definition container.
Can be hierarchical via parent_id.
If is_batchable=true, then the template also defines:
batch_parts (e.g., 7 shares for cow)
batch_part_amount (e.g., 10000 per share)
progress_workflow_template_steps

Steps defined per template (step_key, title, step_order, etc.)
If a child template has no steps, tracker creation falls back to parent steps.
progress_trackers

The runtime instance of a template for a donation:
donation_id
template_id
batch_parts_count (how many parts the donor wants; e.g., 3 shares)
progress_tracker_steps

The runtime steps for that tracker (copied from template steps, status changes over time)
Batching tables

progress_workflow_batches
Batches per template, auto-incremented batch_number (1,2,3…)
donation_batch_allocations
Links donation → batch with exact part range:
batch_number, part_start, part_end, parts_count
Evidence tables

progress_step_evidence (tracker-specific evidence)
progress_batch_step_evidence (batch-shared evidence keyed by batch_id + step_key)
Example: Cow (7 parts), donor buys 3 parts
Template config
In progress_workflow_templates for template “Cow Qurbani”:

is_batchable = true
batch_parts = 7
batch_part_amount = 10000
Steps exist (either on this template or inherited from parent):

booked
animal_purchased
tag_assigned
slaughter_completed
meat_distributed
Donation payload (frontend → backend)
POST /donations

{
  "donor_id": 123,
  "amount": 30000,
  "currency": "PKR",
  "date": "2026-04-28",
  "donation_method": "payfast",
  "donation_source": "website",
  "status": "pending",
  "progress_workflow_template_id": 55,
  "progress_tracker_donor_visible": true,
  "progress_batch_parts_requested": 3
}
What gets created
A row in donations (id say 9001)

A row in progress_trackers (id say 7001)

donation_id = 9001
template_id = 55
batch_parts_count = 3
Batching allocation (when batching runs)
Suppose current batch is Batch #12 and has only 2 parts left.
Then donation will be split across batches:
In donation_batch_allocations you’ll get something like:

Donation 9001 → Batch #12 parts 6–7 (parts_count=2)
Donation 9001 → Batch #13 part 1 (parts_count=1)
In progress_workflow_batches you’ll have:

Batch row for template 55, batch_number=12
Batch row for template 55, batch_number=13
Shared evidence behavior
If staff adds evidence to step tag_assigned for any tracker in Batch #12:

It is stored in progress_batch_step_evidence with:
batch_id = (Batch #12 id)
step_key = "tag_assigned"
When any tracker step list is fetched, the API merges it and labels it:

“Batch #12 evidence”
“Batch #13 evidence” (if donation spans that batch too)
Shared status behavior
If staff marks slaughter_completed as completed for one tracker in Batch #12:

the system propagates that status to the same step_key across all trackers whose donations are in Batch #12 (and also Batch #13 where applicable via the donation spanning logic).
How to answer “What batch # and how many parts does a donation have?”
Query donation_batch_allocations:

Batch numbers: distinct batch_number for that donation_id
Total parts: SUM(parts_count) for that donation_id
That’s the authoritative record.
