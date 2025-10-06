-- Step 1: Rename the old approval_status field to avoid conflict
ALTER TABLE `Submission` CHANGE COLUMN `approval_status` `old_approval_status` VARCHAR(191) NOT NULL DEFAULT 'PENDING';

-- Step 2: Drop notes from QrScan
ALTER TABLE `QrScan` DROP COLUMN `notes`;

-- Step 3: Rename final_status to approval_status
ALTER TABLE `Submission` CHANGE COLUMN `final_status` `approval_status` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING_APPROVAL';

-- Step 4: Now we can safely drop the old field (this will automatically drop the problematic index)
ALTER TABLE `Submission` DROP COLUMN `old_approval_status`;

-- Step 5: Create the new index on the approval_status field
CREATE INDEX `Submission_approval_status_idx` ON `Submission`(`approval_status`);