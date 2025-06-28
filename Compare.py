import os
import shutil
from pathlib import Path
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_all_files(directory):
    """Get all files in directory and subdirectories with their filenames."""
    file_names = {}
    directory_path = Path(directory)
    
    if not directory_path.exists():
        logger.error(f"Directory does not exist: {directory}")
        return file_names
    
    for file_path in directory_path.rglob('*'):
        if file_path.is_file():
            try:
                filename = file_path.name.lower()  # Convert to lowercase for case-insensitive comparison
                if filename not in file_names:
                    file_names[filename] = []
                file_names[filename].append(str(file_path))
            except Exception as e:
                logger.error(f"Error processing file {file_path}: {e}")
    
    return file_names

def find_and_replace_duplicates(location1, location2, dry_run=True):
    """
    Find duplicate files between two locations by filename, delete from location1 
    and move the corresponding file from location2 to location1's path.
    
    Args:
        location1 (str): Target directory (files will be replaced here)
        location2 (str): Source directory (files will be moved from here)
        dry_run (bool): If True, only show what would be done without actually doing it
    """
    
    logger.info(f"Scanning location 1: {location1}")
    location1_files = get_all_files(location1)
    
    logger.info(f"Scanning location 2: {location2}")
    location2_files = get_all_files(location2)
    
    # Find duplicates by filename and plan operations
    operations = []  # List of (delete_path, source_path, destination_path) tuples
    
    for filename, files_loc1 in location1_files.items():
        if filename in location2_files:
            for file_loc1 in files_loc1:
                # For each duplicate in location1, pair it with first match from location2
                if location2_files[filename]:  # Make sure there are files in location2
                    source_file = location2_files[filename][0]  # Take first match
                    operations.append((file_loc1, source_file, file_loc1))
                    # Remove this source file from the list to avoid using it multiple times
                    location2_files[filename] = location2_files[filename][1:]
    
    logger.info(f"Found {len(operations)} file replacement operations")
    
    if not operations:
        logger.info("No duplicate files found!")
        return
    
    # Display planned operations
    print("\n=== PLANNED OPERATIONS ===")
    for delete_path, source_path, dest_path in operations:
        print(f"DELETE: {delete_path}")
        print(f"  MOVE: {source_path}")
        print(f"    TO: {dest_path}")
        print("-" * 80)
    
    if dry_run:
        print(f"\n=== DRY RUN MODE ===")
        print(f"Total operations that would be performed: {len(operations)}")
        print("- Files would be deleted from location 1")
        print("- Corresponding files would be moved from location 2 to location 1")
        print("To actually perform operations, set dry_run=False")
    else:
        # Actually perform operations
        success_count = 0
        failed_count = 0
        
        print(f"\n=== PERFORMING OPERATIONS ===")
        for delete_path, source_path, dest_path in operations:
            try:
                # First, delete the file from location 1
                if os.path.exists(delete_path):
                    os.remove(delete_path)
                    logger.info(f"Deleted: {delete_path}")
                
                # Then, move the file from location 2 to location 1
                if os.path.exists(source_path):
                    # Ensure destination directory exists
                    dest_dir = os.path.dirname(dest_path)
                    os.makedirs(dest_dir, exist_ok=True)
                    
                    shutil.move(source_path, dest_path)
                    logger.info(f"Moved: {source_path} -> {dest_path}")
                    success_count += 1
                else:
                    logger.error(f"Source file no longer exists: {source_path}")
                    failed_count += 1
                    
            except Exception as e:
                logger.error(f"Failed operation for {delete_path}: {e}")
                failed_count += 1
        
        print(f"\nOperations complete!")
        print(f"Successfully completed: {success_count} operations")
        print(f"Failed operations: {failed_count}")
        
        # Show remaining files in location 2
        remaining_files = get_all_files(location2)
        total_remaining = sum(len(files) for files in remaining_files.values())
        print(f"Files remaining in location 2: {total_remaining}")

def main():
    # Define your locations
    location1 = r"F:\LovePorn\Videos"  # Files will be deleted from here
    location2 = r"E:\Downloads"       # Files to compare against
    
    # Verify locations exist
    if not os.path.exists(location1):
        logger.error(f"Location 1 does not exist: {location1}")
        return
    
    if not os.path.exists(location2):
        logger.error(f"Location 2 does not exist: {location2}")
        return
    
    print("=== DUPLICATE FILE FINDER AND REPLACER (BY FILENAME) ===")
    print(f"Location 1 (files will be replaced here): {location1}")
    print(f"Location 2 (files will be moved from here): {location2}")
    print("Note: Files are compared by filename only (case-insensitive)")
    print("Operation: DELETE from location1 -> MOVE from location2 to location1")
    print()
    
    # First run in dry-run mode to see what would be done
    print("Running in DRY RUN mode first...")
    find_and_replace_duplicates(location1, location2, dry_run=True)
    
    # Ask user for confirmation before actual deletion
    print("\n" + "="*60)
    response = input("Do you want to proceed with actual deletion? (yes/no): ").lower().strip()
    
    if response in ['yes', 'y']:
        print("Proceeding with file replacement operations...")
        find_and_replace_duplicates(location1, location2, dry_run=False)
    else:
        print("Operation cancelled by user.")

if __name__ == "__main__":
    main()