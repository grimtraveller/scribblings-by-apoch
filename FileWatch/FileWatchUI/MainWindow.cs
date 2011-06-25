using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Windows.Forms;

namespace FileWatchUI
{
    public partial class MainWindow : Form
    {
        public delegate void AddItemDelegate(ListViewItem item);

        public MainWindow()
        {
            InitializeComponent();
            FileWatchInterop.Init();
            FileWatchInterop.Window = this;

            this.Closing += HandleClosing;
        }

        public void AddActivityItem(ListViewItem item)
        {
            ActivityListView.Items.Add(item);
        }

        private void AddMonitoredFolderButton_Click(object sender, EventArgs e)
        {
            FolderBrowserDialog.ShowDialog();
            MonitoredFoldersListBox.Items.Add(FolderBrowserDialog.SelectedPath);
            FileWatchInterop.AddWatchedPath(FolderBrowserDialog.SelectedPath);
        }

        private void ClearActivityButton_Click(object sender, EventArgs e)
        {
            ActivityListView.Items.Clear();
        }

        private void HandleClosing(object sender, EventArgs e)
        {
            FileWatchInterop.Kill();
        }
    }
}