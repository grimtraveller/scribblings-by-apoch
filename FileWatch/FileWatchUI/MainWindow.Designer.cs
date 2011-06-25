namespace FileWatchUI
{
    partial class MainWindow
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.MonitoredFoldersLabel = new System.Windows.Forms.Label();
            this.MonitoredFoldersListBox = new System.Windows.Forms.ListBox();
            this.AddMonitoredFolderButton = new System.Windows.Forms.Button();
            this.ActivityLabel = new System.Windows.Forms.Label();
            this.ActivityListView = new System.Windows.Forms.ListView();
            this.ClearActivityButton = new System.Windows.Forms.Button();
            this.ActionColumn = new System.Windows.Forms.ColumnHeader();
            this.FileColumn = new System.Windows.Forms.ColumnHeader();
            this.FolderBrowserDialog = new System.Windows.Forms.FolderBrowserDialog();
            this.SuspendLayout();
            // 
            // MonitoredFoldersLabel
            // 
            this.MonitoredFoldersLabel.AutoSize = true;
            this.MonitoredFoldersLabel.Location = new System.Drawing.Point(12, 9);
            this.MonitoredFoldersLabel.Name = "MonitoredFoldersLabel";
            this.MonitoredFoldersLabel.Size = new System.Drawing.Size(91, 13);
            this.MonitoredFoldersLabel.TabIndex = 0;
            this.MonitoredFoldersLabel.Text = "Monitored Folders";
            // 
            // MonitoredFoldersListBox
            // 
            this.MonitoredFoldersListBox.FormattingEnabled = true;
            this.MonitoredFoldersListBox.Location = new System.Drawing.Point(15, 25);
            this.MonitoredFoldersListBox.Name = "MonitoredFoldersListBox";
            this.MonitoredFoldersListBox.Size = new System.Drawing.Size(223, 290);
            this.MonitoredFoldersListBox.TabIndex = 1;
            // 
            // AddMonitoredFolderButton
            // 
            this.AddMonitoredFolderButton.Location = new System.Drawing.Point(16, 328);
            this.AddMonitoredFolderButton.Name = "AddMonitoredFolderButton";
            this.AddMonitoredFolderButton.Size = new System.Drawing.Size(222, 23);
            this.AddMonitoredFolderButton.TabIndex = 2;
            this.AddMonitoredFolderButton.Text = "&Add...";
            this.AddMonitoredFolderButton.UseVisualStyleBackColor = true;
            this.AddMonitoredFolderButton.Click += new System.EventHandler(this.AddMonitoredFolderButton_Click);
            // 
            // ActivityLabel
            // 
            this.ActivityLabel.AutoSize = true;
            this.ActivityLabel.Location = new System.Drawing.Point(244, 9);
            this.ActivityLabel.Name = "ActivityLabel";
            this.ActivityLabel.Size = new System.Drawing.Size(41, 13);
            this.ActivityLabel.TabIndex = 4;
            this.ActivityLabel.Text = "Activity";
            // 
            // ActivityListView
            // 
            this.ActivityListView.Columns.AddRange(new System.Windows.Forms.ColumnHeader[] {
            this.ActionColumn,
            this.FileColumn});
            this.ActivityListView.FullRowSelect = true;
            this.ActivityListView.Location = new System.Drawing.Point(247, 25);
            this.ActivityListView.Name = "ActivityListView";
            this.ActivityListView.Size = new System.Drawing.Size(460, 290);
            this.ActivityListView.TabIndex = 5;
            this.ActivityListView.UseCompatibleStateImageBehavior = false;
            this.ActivityListView.View = System.Windows.Forms.View.Details;
            // 
            // ClearActivityButton
            // 
            this.ClearActivityButton.Location = new System.Drawing.Point(599, 328);
            this.ClearActivityButton.Name = "ClearActivityButton";
            this.ClearActivityButton.Size = new System.Drawing.Size(108, 23);
            this.ClearActivityButton.TabIndex = 6;
            this.ClearActivityButton.Text = "&Clear";
            this.ClearActivityButton.UseVisualStyleBackColor = true;
            this.ClearActivityButton.Click += new System.EventHandler(this.ClearActivityButton_Click);
            // 
            // ActionColumn
            // 
            this.ActionColumn.Text = "Action";
            this.ActionColumn.Width = 100;
            // 
            // FileColumn
            // 
            this.FileColumn.Text = "File";
            this.FileColumn.Width = 350;
            // 
            // MainWindow
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(719, 363);
            this.Controls.Add(this.ClearActivityButton);
            this.Controls.Add(this.ActivityListView);
            this.Controls.Add(this.ActivityLabel);
            this.Controls.Add(this.AddMonitoredFolderButton);
            this.Controls.Add(this.MonitoredFoldersListBox);
            this.Controls.Add(this.MonitoredFoldersLabel);
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.Name = "MainWindow";
            this.Text = "FileWatch";
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.Label MonitoredFoldersLabel;
        private System.Windows.Forms.ListBox MonitoredFoldersListBox;
        private System.Windows.Forms.Button AddMonitoredFolderButton;
        private System.Windows.Forms.Label ActivityLabel;
        private System.Windows.Forms.ColumnHeader ActionColumn;
        private System.Windows.Forms.ColumnHeader FileColumn;
        private System.Windows.Forms.Button ClearActivityButton;
        private System.Windows.Forms.FolderBrowserDialog FolderBrowserDialog;
        public System.Windows.Forms.ListView ActivityListView;
    }
}

