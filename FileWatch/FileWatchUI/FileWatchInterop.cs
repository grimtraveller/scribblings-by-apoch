using System;
using System.Collections.Generic;
using System.Text;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace FileWatchUI
{
    class FileWatchInterop
    {
        public static MainWindow Window = null;

        public static void Init()
        {
            Initialize();
        }

        public static void Kill()
        {
            Shutdown();
        }

        public static void AddWatchedPath(string path)
        {
            WatchPath(path, FileActivityCallback);
        }

        public static void FileActivityCallback(ActivityType Activity, [MarshalAs(UnmanagedType.LPWStr)] string FileName)
        {
            if(Window != null)
            {
                string activityname = "Unknown";

                switch(Activity)
                {
                case ActivityType.StartWatch: activityname = "Watch"; break;
                case ActivityType.EndWatch: activityname = "End Watch"; break;
                case ActivityType.Create: activityname = "Create"; break;
                case ActivityType.Delete: activityname = "Delete"; break;
                case ActivityType.Change: activityname = "Change"; break;
                case ActivityType.NameFrom: activityname = "Rename From"; break;
                case ActivityType.NameTo: activityname = "Rename To"; break;
                }

                string[] columns = {activityname, FileName};
                ListViewItem item = new ListViewItem(columns);
                MainWindow.AddItemDelegate d = new MainWindow.AddItemDelegate(Window.AddActivityItem);
                Window.Invoke(d, new object[] { item });
            }
        }

        public enum ActivityType
        {
            Unknown = 0,
            StartWatch = 1,
            EndWatch = 2,
            Create = 3,
            Delete = 4,
            Change = 5,
            NameFrom = 6,
            NameTo = 7,
        }

        private delegate void FileActivityCallbackDelegate(ActivityType ActivityType, [MarshalAs(UnmanagedType.LPWStr)] string FileName);

        [DllImport("FileWatch.dll")]
        private static extern void Initialize();

        [DllImport("FileWatch.dll")]
        private static extern void Shutdown();

        [DllImport("FileWatch.dll")]
        private static extern void WatchPath([MarshalAs(UnmanagedType.LPWStr)] string path, FileActivityCallbackDelegate callback);
    }
}
