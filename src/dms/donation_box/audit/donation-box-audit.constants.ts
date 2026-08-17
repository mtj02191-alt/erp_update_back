export const DONATION_BOX_AUDIT_PATCH_FIELDS = [
  "box_id_no",
  "key_no",
  "route_id",
  "city_id",
  "shop_name",
  "shopkeeper",
  "cell_no",
  "address",
  "landmark_marketplace",
  "box_type",
  "status",
  "frequency",
  "active_since",
  "last_collection_date",
  "total_collected",
  "collection_count",
  "notes",
  "is_active",
  "is_archived",
  "assigned_user_ids",
] as const;

export const DONATION_BOX_AUDIT_SKIP_KEYS = new Set([
  "updated_by",
  "created_by",
  "assignedUsers",
  "route",
]);
