import os
import shutil
import re
from pathlib import Path

def normalize_name(name):
    """
    Normalize a name by removing special characters, converting to lowercase,
    and replacing spaces/separators with underscores for comparison.
    """
    # Convert to lowercase and replace common separators with spaces
    normalized = re.sub(r'[-_\.\s]+', ' ', name.lower())
    # Remove extra whitespace
    normalized = ' '.join(normalized.split())
    return normalized

def is_video_file(filename):
    """Check if the file is a video file based on its extension."""
    video_extensions = {'.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', 
                       '.m4v', '.3gp', '.ogv', '.ts', '.m2ts', '.mts'}
    return Path(filename).suffix.lower() in video_extensions

def find_matching_folder(filename, folder_names):
    """
    Find which folder name matches the filename.
    Returns the original folder name if a match is found, None otherwise.
    """
    normalized_filename = normalize_name(filename)
    
    for folder_name in folder_names:
        normalized_folder = normalize_name(folder_name)
        
        # Check if the normalized folder name appears in the normalized filename
        if normalized_folder in normalized_filename:
            return folder_name
    
    return None

def organize_videos(root_directory):
    """
    Organize video files into appropriate folders based on folder names.
    
    Args:
        root_directory (str): Path to the directory containing folders and video files
    """
    root_path = Path(root_directory)
    
    if not root_path.exists():
        print(f"Error: Directory '{root_directory}' does not exist.")
        return
    
    # Get all folder names in the root directory
    folder_names = [item.name for item in root_path.iterdir() 
                   if item.is_dir() and not item.name.startswith('.')]
    
    if not folder_names:
        print("No folders found in the directory.")
        return
    
    print(f"Found {len(folder_names)} folders: {folder_names}")
    
    # Get all video files in the root directory
    video_files = [item for item in root_path.iterdir() 
                  if item.is_file() and is_video_file(item.name)]
    
    if not video_files:
        print("No video files found in the root directory.")
        return
    
    print(f"Found {len(video_files)} video files to organize.")
    
    moved_count = 0
    unmatched_files = []
    
    # Process each video file
    for video_file in video_files:
        matching_folder = find_matching_folder(video_file.name, folder_names)
        
        if matching_folder:
            # Construct destination path
            destination_folder = root_path / matching_folder
            destination_file = destination_folder / video_file.name
            
            # Check if file already exists in destination and replace it
            if destination_file.exists():
                print(f"Replacing existing '{video_file.name}' in '{matching_folder}' folder.")
            
            try:
                # Move the file
                shutil.move(str(video_file), str(destination_file))
                print(f"Moved '{video_file.name}' to '{matching_folder}' folder.")
                moved_count += 1
            except Exception as e:
                print(f"Error moving '{video_file.name}': {e}")
        else:
            unmatched_files.append(video_file.name)
    
    # Summary
    print(f"\n--- Summary ---")
    print(f"Successfully moved {moved_count} files.")
    
    if unmatched_files:
        print(f"{len(unmatched_files)} files couldn't be matched to any folder name.")

def main():
    """Main function to run the video organizer."""
    # Set default directory to "Videos"
    directory = "Videos"
    
    # Check if Videos directory exists
    if not os.path.exists(directory):
        print(f"Videos directory not found. Please enter the correct path:")
        directory = input("Enter the path to the directory containing folders and video files: ").strip()
        directory = directory.strip('"\'')
        
        if not directory:
            print("No directory specified. Using current directory.")
            directory = "."
    
    print(f"\nOrganizing videos in: {os.path.abspath(directory)}")
    
    # Ask for confirmation
    confirm = input("Do you want to proceed? (y/N): ").strip().lower()
    if confirm not in ['y', 'yes']:
        print("Operation cancelled.")
        return
    
    # Run the organizer
    organize_videos(directory)

if __name__ == "__main__":
    main()