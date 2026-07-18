// // Default permissions object (standardized format)
// const defaultPermissions = {
//   "super_admin": {
//     "accounts_and_finance": {
//       "create": true,
//       "list_view": true,
//       "view": true,
//       "update": true,
//       "delete": true,
//       "reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       }
//     },
//     "procurements": {
//       "create": true,
//       "list_view": true,
//       "view": true,
//       "update": true,
//       "delete": true,
//       "reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       }
//     },
//     "store": {
//       "create": true,
//       "list_view": true,
//       "view": true,
//       "update": true,
//       "delete": true,
//       "reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       }
//     },
//     "program": {
//       "application_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       },
//       "area_ration_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       },
//       "education_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       },
//       "financial_assistance_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       },
//       "kasb_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       },
//       "kasb_training_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       },
//       "marriage_gifts_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       },
//       "ration_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       },
//       "sewing_machine_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       },
//       "tree_plantation_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       },
//       "water_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       },
//       "wheel_chair_or_crutches_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       }
//     },
//     "admin": {
//       "create": true,
//       "list_view": true,
//       "view": true,
//       "update": true,
//       "delete": true,
//       "dashboard": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": true
//       }
//     },
//     "permissions": {
//       "create": true,
//       "list_view": true,
//       "view": true,
//       "update": true,
//       "delete": true
//     },
//     "users": {
//       "create": true,
//       "list_view": true,
//       "view": true,
//       "update": true,
//       "delete": true
//     }
//   },
//   "accounts_manager": {
//     "accounts_and_finance": {
//       "create": true,
//       "list_view": true,
//       "view": true,
//       "update": true,
//       "delete": false,
//       "reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": false
//       }
//     },
//     "admin": {
//       "dashboard": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       }
//     }
//   },
//   "procurements_manager": {
//     "procurements": {
//       "create": true,
//       "list_view": true,
//       "view": true,
//       "update": true,
//       "delete": false,
//       "reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": false
//       }
//     },
//     "admin": {
//       "dashboard": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       }
//     }
//   },
//   "store_manager": {
//     "store": {
//       "create": true,
//       "list_view": true,
//       "view": true,
//       "update": true,
//       "delete": false,
//       "reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": false
//       }
//     },
//     "admin": {
//       "dashboard": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       }
//     }
//   },
//   "program_manager": {
//     "program": {
//       "application_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": false
//       },
//       "area_ration_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": false
//       },
//       "education_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": false
//       },
//       "financial_assistance_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": false
//       },
//       "kasb_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": false
//       },
//       "kasb_training_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": false
//       },
//       "marriage_gifts_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": false
//       },
//       "ration_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": false
//       },
//       "sewing_machine_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": false
//       },
//       "tree_plantation_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": false
//       },
//       "water_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": false
//       },
//       "wheel_chair_or_crutches_reports": {
//         "create": true,
//         "list_view": true,
//         "view": true,
//         "update": true,
//         "delete": false
//       }
//     },
//     "admin": {
//       "dashboard": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       }
//     }
//   },
//   "viewer": {
//     "accounts_and_finance": {
//       "create": false,
//       "list_view": true,
//       "view": true,
//       "update": false,
//       "delete": false
//     },
//     "procurements": {
//       "create": false,
//       "list_view": true,
//       "view": true,
//       "update": false,
//       "delete": false
//     },
//     "store": {
//       "create": false,
//       "list_view": true,
//       "view": true,
//       "update": false,
//       "delete": false
//     },
//     "program": {
//       "application_reports": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       },
//       "area_ration_reports": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       },
//       "education_reports": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       },
//       "financial_assistance_reports": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       },
//       "kasb_reports": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       },
//       "kasb_training_reports": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       },
//       "marriage_gifts_reports": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       },
//       "ration_reports": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       },
//       "sewing_machine_reports": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       },
//       "tree_plantation_reports": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       },
//       "water_reports": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       },
//       "wheel_chair_or_crutches_reports": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       }
//     },
//     "admin": {
//       "dashboard": {
//         "create": false,
//         "list_view": true,
//         "view": true,
//         "update": false,
//         "delete": false
//       }
//     }
//   }
// };

// export type PermissionType =
//   | 'super_admin'
//   | 'accounts_manager'
//   | 'procurements_manager'
//   | 'store_manager'
//   | 'program_manager'
//   | 'viewer';

// export interface PermissionStructure {
//   [key: string]: {
//     view?: boolean;
//     create?: boolean;
//     edit?: boolean;
//     delete?: boolean;
//     export?: boolean;
//     approve?: boolean;
//     reports?: {
//       view?: boolean;
//       export?: boolean;
//       approve?: boolean;
//     };
//     [key: string]: any;
//   };
// }

// /**
//  * Get default permissions for a specific user type
//  * @param userType - The type of user (super_admin, accounts_manager, etc.)
//  * @returns Permission structure for the user type
//  */
// export function getDefaultPermissions(userType: PermissionType): Record<string, any> {
//   return defaultPermissions[userType] || {};
// }

// /**
//  * Get all available permission types
//  * @returns Array of available permission types
//  */
// export function getAvailablePermissionTypes(): PermissionType[] {
//   return Object.keys(defaultPermissions) as PermissionType[];
// }

// /**
//  * Check if a permission type exists
//  * @param userType - The type of user to check
//  * @returns boolean indicating if the permission type exists
//  */
// export function hasPermissionType(userType: string): userType is PermissionType {
//   return userType in defaultPermissions;
// }

// /**
//  * Get all default permissions (for admin purposes)
//  * @returns All default permissions
//  */
// export function getAllDefaultPermissions(): Record<string, any> {
//   return defaultPermissions;
// }

// /**
//  * Merge custom permissions with default permissions
//  * @param userType - The default permission type to use as base
//  * @param customPermissions - Custom permissions to merge
//  * @returns Merged permissions object
//  */
// export function mergePermissions(
//   userType: PermissionType,
//   customPermissions: Record<string, any> = {}
// ): Record<string, any> {
//   const defaultPerms = getDefaultPermissions(userType);

//   // Deep merge function
//   const deepMerge = (target: any, source: any): any => {
//     const result = { ...target };

//     for (const key in source) {
//       if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
//         result[key] = deepMerge(result[key] || {}, source[key]);
//       } else {
//         result[key] = source[key];
//       }
//     }

//     return result;
//   };

//   return deepMerge(defaultPerms, customPermissions);
// }

// /**
//  * Validate permission structure
//  * @param permissions - Permission object to validate
//  * @returns boolean indicating if the structure is valid
//  */
// export function validatePermissionStructure(permissions: any): boolean {
//   if (!permissions || typeof permissions !== 'object') {
//     return false;
//   }

//   // Add validation logic here if needed
//   // For now, just check if it's a non-null object
//   return true;
// }
