import os
import shutil
from pathlib import Path

def sync_video_files(videos_folder_path):
    """
    Synchronizes video files from the main Videos folder to subfolders.
    
    Args:
        videos_folder_path (str): Path to the Videos folder
    """
    videos_path = Path(videos_folder_path)
    
    # Check if Videos folder exists
    if not videos_path.exists():
        print(f"Error: Videos folder '{videos_folder_path}' does not exist.")
        return
    
    # Get all files (not folders) in the main Videos directory
    main_files = []
    for item in videos_path.iterdir():
        if item.is_file():
            main_files.append(item.name)
    
    print(f"Found {len(main_files)} files in main Videos folder.")
    
    if not main_files:
        print("No files found in the main Videos folder.")
        return
    
    # Get all subdirectories in Videos folder
    subdirs = [item for item in videos_path.iterdir() if item.is_dir()]
    
    print(f"Found {len(subdirs)} subdirectories to check.\n")
    
    # Process each subdirectory
    files_replaced = 0
    files_not_found = 0
    files_to_delete = set()  # Track files that were successfully replaced
    
    for subdir in subdirs:
        # Check each file from main directory
        for filename in main_files:
            main_file_path = videos_path / filename
            subdir_file_path = subdir / filename
            
            # Check if file exists in subdirectory
            if subdir_file_path.exists():
                try:
                    # Replace the file in subdirectory with the one from main folder
                    shutil.copy2(main_file_path, subdir_file_path)
                    print(f"✓ Replaced: {filename} in {subdir.name}/")
                    files_replaced += 1
                    files_to_delete.add(filename)  # Mark for deletion
                    
                except Exception as e:
                    print(f"✗ Error replacing {filename} in {subdir.name}/: {str(e)}")
            else:
                files_not_found += 1
    
    # Delete successfully replaced files from main directory
    files_deleted = 0
    if files_to_delete:
        print(f"\n--- Deleting files from main directory ---")
        for filename in files_to_delete:
            main_file_path = videos_path / filename
            try:
                main_file_path.unlink()  # Delete the file
                print(f"✓ Deleted from main folder: {filename}")
                files_deleted += 1
            except Exception as e:
                print(f"✗ Error deleting {filename}: {str(e)}")
    else:
        print(f"\nNo files to delete from main directory.")
    
    # Summary
    print(f"\n=== SUMMARY ===")
    print(f"Files successfully replaced: {files_replaced}")
    print(f"Files deleted from main folder: {files_deleted}")
    print(f"Files not found in subfolders: {files_not_found}")
    print(f"Total subfolders processed: {len(subdirs)}")

def main():
    # Remove quotes if user added them
    videos_folder = "Videos"
    
    if not videos_folder:
        print("No path provided. Please run the script again with a valid path.")
        return
    
    sync_video_files(videos_folder)

if __name__ == "__main__":
    main()